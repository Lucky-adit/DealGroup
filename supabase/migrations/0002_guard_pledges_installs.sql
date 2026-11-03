-- Tighten direct-API access found in testing:
-- 1. Buyers could set their own pledge status or deposit status to anything.
-- 2. The winning seller could mark an install "complete" (only the buyer may confirm).
-- Deposit status is now derived by the database, never sent by clients.

create or replace function public.guard_pledge_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_locked boolean; v_target int; v_pledged bigint;
begin
  if public.is_admin() then return new; end if;
  new.deal_id := old.deal_id;
  new.user_id := old.user_id;
  select d.locked_price is not null, d.target into v_locked, v_target from deals d where d.id = old.deal_id;
  select s.pledged into v_pledged from public.deal_stats() s where s.deal_id = old.deal_id;

  if new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') and not (old.status = 'active' and v_locked) then
      raise exception 'can only accept or decline an active pledge on a locked deal';
    elsif new.status = 'withdrawn' and not (old.status = 'active' and not v_locked and v_pledged < v_target) then
      raise exception 'can only leave while the deal is still collecting buyers';
    elsif new.status = 'active' and not (old.status = 'withdrawn' and not v_locked) then
      raise exception 'cannot reactivate this pledge';
    elsif new.status = 'refunded' then
      raise exception 'refunds are set by the platform';
    end if;
  end if;
  if old.status in ('accepted', 'declined') and (new.quantity <> old.quantity) then
    raise exception 'pledge is final after the price locks';
  end if;

  new.deposit_status := case
    when new.status in ('declined', 'withdrawn', 'refunded') then 'refunded'
    when new.status = 'active' then 'held'
    when exists (select 1 from installs i where i.pledge_id = old.id and i.stage = 'complete') then 'applied'
    else old.deposit_status end;
  return new;
end $$;
create trigger pledges_guard before update on public.pledges
  for each row execute function public.guard_pledge_update();

-- New pledges always start held/active whatever the client sends.
create or replace function public.guard_pledge_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.status := 'active'; new.deposit_status := 'held'; end if;
  return new;
end $$;
create trigger pledges_guard_insert before insert on public.pledges
  for each row execute function public.guard_pledge_insert();

-- Completing an install applies the deposit to the price.
create or replace function public.on_install_complete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stage = 'complete' then update pledges set deposit_status = 'applied' where id = new.pledge_id; end if;
  return new;
end $$;
create trigger installs_complete after insert or update on public.installs
  for each row execute function public.on_install_complete();

-- Sellers move installs forward but never to "complete".
drop policy "installs updated by admin or winner" on public.installs;
create policy "installs updated by admin" on public.installs for update using (public.is_admin());
create policy "installs updated by winning seller" on public.installs for update
  using (exists (select 1 from pledges p where p.id = pledge_id and public.is_winning_seller(p.deal_id)))
  with check (stage <> 'complete');
