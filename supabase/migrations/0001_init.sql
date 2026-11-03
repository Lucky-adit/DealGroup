-- DealGroup schema: group-buying deals, pledges, sellers, sealed bids, installs, reviews.
-- Run in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- deals ----------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('solar','car','tw')),
  title jsonb not null,            -- {"en": "...", "hi": "..."}
  area jsonb not null,
  city text not null,
  market_price numeric not null check (market_price > 0),
  target int not null check (target > 0),
  deposit numeric not null check (deposit >= 0),
  closes_at timestamptz not null,
  tiers jsonb not null default '[]', -- [{"minBuyers": 10, "price": 180000}, ...]
  locked_price numeric,
  winning_seller_id uuid,
  locked_at timestamptz,
  is_example boolean not null default false,
  example_pledges int not null default 0, -- pre-filled count for example deals only
  created_at timestamptz not null default now()
);

-- ---------- sellers ----------
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  company text not null,
  gst_number text not null,
  empanelment_id text not null,
  city text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.deals add constraint deals_winner_fk foreign key (winning_seller_id) references public.sellers(id);

-- Only admins may change `verified`; changing GST or empanelment resets it.
create or replace function public.guard_seller_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.verified := false;
    elsif new.verified is distinct from old.verified then new.verified := old.verified;
    end if;
    if tg_op = 'UPDATE' and (new.gst_number <> old.gst_number or new.empanelment_id <> old.empanelment_id) then
      new.verified := false;
    end if;
  end if;
  return new;
end $$;
create trigger sellers_guard before insert or update on public.sellers
  for each row execute function public.guard_seller_verified();

-- ---------- pledges ----------
create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  quantity int not null check (quantity between 1 and 5),
  name text not null,
  phone text not null,
  status text not null default 'active' check (status in ('active','accepted','declined','refunded','withdrawn')),
  deposit_status text not null default 'held' check (deposit_status in ('held','refunded','applied')),
  created_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

-- ---------- bids (sealed) ----------
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals on delete cascade,
  seller_id uuid not null references public.sellers on delete cascade,
  price_per_unit numeric not null check (price_per_unit > 0),
  terms text not null default '',
  created_at timestamptz not null default now(),
  unique (deal_id, seller_id)
);

-- ---------- requests, installs, reviews ----------
create table public.deal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product text not null,
  city text not null,
  quantity int not null check (quantity > 0),
  budget numeric,
  created_at timestamptz not null default now()
);

create table public.installs (
  pledge_id uuid primary key references public.pledges on delete cascade,
  stage text not null default 'survey' check (stage in ('survey','installed','net_meter','subsidy_filed','complete')),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null unique references public.pledges on delete cascade,
  seller_id uuid not null references public.sellers on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

-- Accepting a locked price opens an install record.
create or replace function public.on_pledge_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    insert into public.installs (pledge_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger pledges_accepted after update on public.pledges
  for each row execute function public.on_pledge_accepted();

-- ---------- public stats (counts without exposing pledge rows or sealed bids) ----------
create or replace function public.deal_stats()
returns table (deal_id uuid, pledged bigint, bid_count bigint, best_verified_bid numeric)
language sql stable security definer set search_path = public as $$
  select d.id,
    d.example_pledges + coalesce((select sum(p.quantity) from pledges p
       where p.deal_id = d.id and p.status in ('active','accepted')), 0),
    (select count(*) from bids b where b.deal_id = d.id),
    case when public.is_admin() or d.locked_price is not null then
      (select min(b.price_per_unit) from bids b join sellers s on s.id = b.seller_id
        where b.deal_id = d.id and s.verified) end
  from deals d;
$$;

-- Admin locks the best verified bid once the target is reached.
create or replace function public.lock_deal(p_deal uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_pledged bigint; v_target int; v_bid record;
begin
  if not public.is_admin() then return 'forbidden'; end if;
  select pledged into v_pledged from public.deal_stats() where deal_id = p_deal;
  select target into v_target from deals where id = p_deal and locked_price is null;
  if v_target is null or v_pledged < v_target then return 'not_ready'; end if;
  select b.price_per_unit, b.seller_id into v_bid from bids b join sellers s on s.id = b.seller_id
    where b.deal_id = p_deal and s.verified order by b.price_per_unit asc, b.created_at asc limit 1;
  if v_bid is null then return 'no_verified_bid'; end if;
  update deals set locked_price = v_bid.price_per_unit, winning_seller_id = v_bid.seller_id, locked_at = now() where id = p_deal;
  return 'ok';
end $$;

create or replace function public.is_winning_seller(p_deal uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deals d join sellers s on s.id = d.winning_seller_id
                 where d.id = p_deal and s.user_id = auth.uid());
$$;

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.sellers enable row level security;
alter table public.pledges enable row level security;
alter table public.bids enable row level security;
alter table public.deal_requests enable row level security;
alter table public.installs enable row level security;
alter table public.reviews enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- Only admins can change anyone's role.
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.role := old.role; end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_role();

create policy "deals are public" on public.deals for select using (true);
create policy "admins manage deals" on public.deals for all using (public.is_admin()) with check (public.is_admin());

create policy "sellers are public" on public.sellers for select using (true);
create policy "seller registers self" on public.sellers for insert with check (user_id = auth.uid());
create policy "seller edits self" on public.sellers for update using (user_id = auth.uid() or public.is_admin());

create policy "see own or as admin or winner" on public.pledges for select
  using (user_id = auth.uid() or public.is_admin() or (public.is_winning_seller(deal_id) and status = 'accepted'));
create policy "pledge for self while open" on public.pledges for insert
  with check (user_id = auth.uid() and exists (select 1 from deals d where d.id = deal_id and d.locked_price is null and d.closes_at > now()));
create policy "edit own pledge" on public.pledges for update using (user_id = auth.uid() or public.is_admin());

create policy "seller sees own bids" on public.bids for select
  using (public.is_admin() or exists (select 1 from sellers s where s.id = seller_id and s.user_id = auth.uid()));
create policy "seller bids as self" on public.bids for insert
  with check (exists (select 1 from sellers s where s.id = seller_id and s.user_id = auth.uid())
              and exists (select 1 from deals d where d.id = deal_id and d.locked_price is null));
create policy "seller updates own bid" on public.bids for update
  using (exists (select 1 from sellers s where s.id = seller_id and s.user_id = auth.uid()))
  with check (exists (select 1 from deals d where d.id = deal_id and d.locked_price is null));

create policy "requests own or admin" on public.deal_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "request as self" on public.deal_requests for insert with check (user_id = auth.uid());

create policy "installs visible to parties" on public.installs for select using (
  public.is_admin() or exists (select 1 from pledges p where p.id = pledge_id and (p.user_id = auth.uid() or public.is_winning_seller(p.deal_id))));
create policy "installs updated by admin or winner" on public.installs for update using (
  public.is_admin() or exists (select 1 from pledges p where p.id = pledge_id and public.is_winning_seller(p.deal_id)));
create policy "installs inserted by admin" on public.installs for insert with check (public.is_admin());

create policy "reviews are public" on public.reviews for select using (true);
create policy "buyer reviews after install" on public.reviews for insert with check (
  exists (select 1 from pledges p join installs i on i.pledge_id = p.id join deals d on d.id = p.deal_id
          where p.id = pledge_id and p.user_id = auth.uid() and i.stage = 'complete' and d.winning_seller_id = seller_id));
create policy "buyer edits own review" on public.reviews for update using (
  exists (select 1 from pledges p where p.id = pledge_id and p.user_id = auth.uid()));
create policy "buyer confirms own install" on public.installs for update
  using (exists (select 1 from pledges p where p.id = pledge_id and p.user_id = auth.uid()) and stage = 'subsidy_filed')
  with check (stage = 'complete');
