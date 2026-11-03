import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bid, Deal, DealRequest, Install, Pledge, Review, Seller } from "../types";
import type { Repo } from "./repo";
import { withStats } from "./stats";

type Row = Record<string, any>;

const toDeal = (r: Row): Deal => ({
  id: r.id, category: r.category, title: r.title, area: r.area, city: r.city,
  marketPrice: Number(r.market_price), target: r.target, deposit: Number(r.deposit), closesAt: r.closes_at,
  tiers: r.tiers ?? [], lockedPrice: r.locked_price == null ? null : Number(r.locked_price),
  winningSellerId: r.winning_seller_id, lockedAt: r.locked_at, isExample: r.is_example, createdAt: r.created_at,
});
const toPledge = (r: Row): Pledge => ({
  id: r.id, dealId: r.deal_id, userId: r.user_id, quantity: r.quantity, name: r.name, phone: r.phone,
  status: r.status, depositStatus: r.deposit_status, createdAt: r.created_at,
});
const toSeller = (r: Row): Seller => ({
  id: r.id, userId: r.user_id, company: r.company, gstNumber: r.gst_number, empanelmentId: r.empanelment_id,
  city: r.city, verified: r.verified, createdAt: r.created_at,
});
const toBid = (r: Row): Bid => ({
  id: r.id, dealId: r.deal_id, sellerId: r.seller_id, pricePerUnit: Number(r.price_per_unit), terms: r.terms, createdAt: r.created_at,
});
const toRequest = (r: Row): DealRequest => ({
  id: r.id, userId: r.user_id, product: r.product, city: r.city, quantity: r.quantity,
  budget: r.budget == null ? null : Number(r.budget), createdAt: r.created_at,
});
const toInstall = (r: Row | null): Install | null => (r ? { pledgeId: r.pledge_id, stage: r.stage, updatedAt: r.updated_at } : null);
const toReview = (r: Row | null): Review | null =>
  r ? { id: r.id, pledgeId: r.pledge_id, sellerId: r.seller_id, rating: r.rating, comment: r.comment, createdAt: r.created_at } : null;

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function statsMap(sb: SupabaseClient) {
  const rows = check(await sb.rpc("deal_stats")) as Row[];
  return new Map(rows.map((r) => [r.deal_id as string, r]));
}

const phaseOrder: Record<string, number> = { pledging: 0, bidding: 1, locked: 2, expired: 3 };

/** Repo backed by Supabase. Works with any client: the Next.js server client or the React Native client. */
export function createSupabaseRepo(sb: SupabaseClient): Repo {
  const attach = (deal: Deal, m: Map<string, Row>) => {
    const s = m.get(deal.id);
    return withStats(deal, Number(s?.pledged ?? 0), Number(s?.bid_count ?? 0), s?.best_verified_bid == null ? null : Number(s.best_verified_bid));
  };

  return {
    async listDeals() {
      const [rows, m] = await Promise.all([sb.from("deals").select("*").order("created_at", { ascending: false }), statsMap(sb)]);
      return (check(rows) as Row[]).map((r) => attach(toDeal(r), m)).sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase]);
    },
    async getDeal(id) {
      const row = check(await sb.from("deals").select("*").eq("id", id).maybeSingle()) as Row | null;
      return row ? attach(toDeal(row), await statsMap(sb)) : null;
    },
    async createDeal(input) {
      const row = check(await sb.from("deals").insert({
        category: input.category, title: input.title, area: input.area, city: input.city, market_price: input.marketPrice,
        target: input.target, deposit: input.deposit, closes_at: input.closesAt, tiers: input.tiers,
      }).select().single()) as Row;
      return toDeal(row);
    },
    async lockDeal(dealId) {
      const result = check(await sb.rpc("lock_deal", { p_deal: dealId })) as string;
      if (result === "ok") return { ok: true };
      return { ok: false, reason: result === "no_verified_bid" ? "no_verified_bid" : "not_ready" };
    },

    async getMyPledge(dealId, userId) {
      const r = check(await sb.from("pledges").select("*").eq("deal_id", dealId).eq("user_id", userId).neq("status", "withdrawn").maybeSingle()) as Row | null;
      return r ? toPledge(r) : null;
    },
    async upsertPledge(input) {
      const r = check(await sb.from("pledges").upsert({
        deal_id: input.dealId, user_id: input.userId, quantity: input.quantity, name: input.name, phone: input.phone,
        status: "active", deposit_status: "held",
      }, { onConflict: "deal_id,user_id" }).select().single()) as Row;
      return toPledge(r);
    },
    async withdrawPledge(dealId, userId) {
      check(await sb.from("pledges").update({ status: "withdrawn", deposit_status: "refunded" }).eq("deal_id", dealId).eq("user_id", userId));
    },
    async respondToLock(pledgeId, userId, accept) {
      check(await sb.from("pledges").update(accept ? { status: "accepted" } : { status: "declined", deposit_status: "refunded" })
        .eq("id", pledgeId).eq("user_id", userId));
    },
    async listMyPledges(userId) {
      const rows = check(await sb.from("pledges").select("*, installs(*), reviews(*)").eq("user_id", userId).neq("status", "withdrawn")) as Row[];
      if (!rows.length) return [];
      const dealRows = check(await sb.from("deals").select("*, sellers:winning_seller_id(company)").in("id", rows.map((r) => r.deal_id))) as Row[];
      const m = await statsMap(sb);
      const deals = new Map(dealRows.map((d) => [d.id, d]));
      return rows.map((r) => {
        const d = deals.get(r.deal_id)!;
        return {
          ...toPledge(r),
          deal: attach(toDeal(d), m),
          install: toInstall(Array.isArray(r.installs) ? r.installs[0] ?? null : r.installs),
          review: toReview(Array.isArray(r.reviews) ? r.reviews[0] ?? null : r.reviews),
          winner: d.sellers ? { company: d.sellers.company } : null,
        };
      });
    },
    async listDealPledges(dealId) {
      const rows = check(await sb.from("pledges").select("*, installs(*)").eq("deal_id", dealId).neq("status", "withdrawn")) as Row[];
      return rows.map((r) => ({ ...toPledge(r), install: toInstall(Array.isArray(r.installs) ? r.installs[0] ?? null : r.installs) }));
    },

    async getSellerByUser(userId) {
      const r = check(await sb.from("sellers").select("*").eq("user_id", userId).maybeSingle()) as Row | null;
      return r ? toSeller(r) : null;
    },
    async upsertSeller(input) {
      const r = check(await sb.from("sellers").upsert({
        user_id: input.userId, company: input.company, gst_number: input.gstNumber, empanelment_id: input.empanelmentId, city: input.city,
      }, { onConflict: "user_id" }).select().single()) as Row;
      return toSeller(r);
    },
    async listSellers() {
      const rows = check(await sb.from("sellers").select("*, reviews(rating)").order("created_at", { ascending: false })) as Row[];
      return rows.map((r) => {
        const ratings = ((r.reviews ?? []) as Row[]).map((x) => x.rating as number);
        return { ...toSeller(r), reviewCount: ratings.length, avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null };
      });
    },
    async setSellerVerified(sellerId, verified) {
      check(await sb.from("sellers").update({ verified }).eq("id", sellerId));
    },

    async upsertBid(input) {
      const r = check(await sb.from("bids").upsert({
        deal_id: input.dealId, seller_id: input.sellerId, price_per_unit: input.pricePerUnit, terms: input.terms,
      }, { onConflict: "deal_id,seller_id" }).select().single()) as Row;
      return toBid(r);
    },
    async listBidsForDeal(dealId) {
      const rows = check(await sb.from("bids").select("*, sellers(id, company, verified)").eq("deal_id", dealId).order("price_per_unit")) as Row[];
      return rows.map((r) => ({ ...toBid(r), seller: { id: r.sellers.id, company: r.sellers.company, verified: r.sellers.verified } }));
    },
    async listBidsBySeller(sellerId) {
      return (check(await sb.from("bids").select("*").eq("seller_id", sellerId)) as Row[]).map(toBid);
    },

    async createRequest(input) {
      return toRequest(check(await sb.from("deal_requests").insert({
        user_id: input.userId, product: input.product, city: input.city, quantity: input.quantity, budget: input.budget,
      }).select().single()) as Row);
    },
    async listRequests() {
      return (check(await sb.from("deal_requests").select("*").order("created_at", { ascending: false })) as Row[]).map(toRequest);
    },
    async listMyRequests(userId) {
      return (check(await sb.from("deal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false })) as Row[]).map(toRequest);
    },

    async setInstallStage(pledgeId, stage) {
      check(await sb.from("installs").upsert({ pledge_id: pledgeId, stage, updated_at: new Date().toISOString() }));
      if (stage === "complete") check(await sb.from("pledges").update({ deposit_status: "applied" }).eq("id", pledgeId));
    },
    async addReview(input) {
      const p = check(await sb.from("pledges").select("deal_id, deals(winning_seller_id)").eq("id", input.pledgeId).eq("user_id", input.userId).single()) as Row;
      const sellerId = p.deals?.winning_seller_id;
      if (!sellerId) throw new Error("not_allowed");
      return toReview(check(await sb.from("reviews").upsert({
        pledge_id: input.pledgeId, seller_id: sellerId, rating: input.rating, comment: input.comment,
      }, { onConflict: "pledge_id" }).select().single()) as Row)!;
    },
  };
}
