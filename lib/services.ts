/**
 * Business rules shared by the website (server actions) and the mobile apps.
 * Each function validates input, checks the caller's permission and then calls the repo.
 * The database's row-level security is a second line of defence, not the only one.
 */
import type { Repo } from "./data/repo";
import { defaultTiers, normalizeIndianPhone } from "./pricing";
import { INSTALL_STAGES, type Category, type InstallStage, type Role, type SessionUser } from "./types";

export type Result = { ok?: boolean; error?: string; message?: string } | null;
type Ctx = { repo: Repo; user: SessionUser | null };

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
function need(user: SessionUser | null, roles?: Role[]): string | null {
  if (!user) return "need_login";
  if (roles && !roles.includes(user.role)) return "forbidden";
  return null;
}

// ---------- buyers ----------
export async function pledge({ repo, user }: Ctx, input: { dealId: string; name: string; phone: string; quantity: number | string }): Promise<Result> {
  const err = need(user);
  if (err || !user) return { error: err ?? "need_login" };
  const name = clean(input.name, 80);
  const phone = normalizeIndianPhone(clean(input.phone, 20));
  const quantity = Math.round(toNum(input.quantity));
  if (!name || !(quantity >= 1 && quantity <= 5)) return { error: "required" };
  if (!phone) return { error: "bad_phone" };
  const deal = await repo.getDeal(clean(input.dealId, 64));
  if (!deal || (deal.phase !== "pledging" && deal.phase !== "bidding")) return { error: "pledge_closed" };
  await repo.upsertPledge({ dealId: deal.id, userId: user.id, quantity, name, phone });
  return { ok: true };
}

export async function withdraw({ repo, user }: Ctx, dealId: string): Promise<Result> {
  if (!user) return { error: "need_login" };
  const deal = await repo.getDeal(clean(dealId, 64));
  if (!deal || deal.phase === "locked") return { error: "pledge_closed" };
  await repo.withdrawPledge(deal.id, user.id);
  return { ok: true };
}

export async function respondToLock({ repo, user }: Ctx, pledgeId: string, accept: boolean): Promise<Result> {
  if (!user) return { error: "need_login" };
  await repo.respondToLock(clean(pledgeId, 64), user.id, accept);
  return { ok: true, message: accept ? "accepted" : "declined" };
}

export async function requestDeal({ repo, user }: Ctx, input: { product: string; city?: string; quantity?: number | string; budget?: number | string }): Promise<Result> {
  if (!user) return { error: "need_login" };
  const product = clean(input.product, 120);
  if (!product) return { error: "required" };
  const budget = toNum(input.budget);
  await repo.createRequest({
    userId: user.id, product, city: clean(input.city, 60) || "Ahmedabad",
    quantity: Math.max(1, Math.min(100, Math.round(toNum(input.quantity)) || 1)), budget: budget > 0 ? budget : null,
  });
  return { ok: true };
}

export async function confirmInstall({ repo, user }: Ctx, pledgeId: string): Promise<Result> {
  if (!user) return { error: "need_login" };
  const mine = (await repo.listMyPledges(user.id)).find((p) => p.id === pledgeId);
  if (!mine || mine.install?.stage !== "subsidy_filed") return { error: "forbidden" };
  await repo.setInstallStage(pledgeId, "complete");
  return { ok: true };
}

export async function review({ repo, user }: Ctx, input: { pledgeId: string; rating: number | string; comment?: string }): Promise<Result> {
  if (!user) return { error: "need_login" };
  const rating = Math.round(toNum(input.rating));
  if (!(rating >= 1 && rating <= 5)) return { error: "required" };
  const mine = (await repo.listMyPledges(user.id)).find((p) => p.id === input.pledgeId);
  if (!mine || mine.install?.stage !== "complete") return { error: "forbidden" };
  await repo.addReview({ pledgeId: input.pledgeId, userId: user.id, rating, comment: clean(input.comment, 1000) });
  return { ok: true };
}

// ---------- sellers ----------
export async function saveSeller({ repo, user }: Ctx, input: { company: string; gst: string; empanelment: string; city?: string }): Promise<Result> {
  if (!user) return { error: "need_login" };
  const company = clean(input.company, 120);
  const gstNumber = clean(input.gst, 15).toUpperCase();
  const empanelmentId = clean(input.empanelment, 60);
  if (!company || !gstNumber || !empanelmentId) return { error: "required" };
  await repo.upsertSeller({ userId: user.id, company, gstNumber, empanelmentId, city: clean(input.city, 60) || "Ahmedabad" });
  return { ok: true };
}

export async function placeBid({ repo, user }: Ctx, input: { dealId: string; price: number | string; terms?: string }): Promise<Result> {
  if (!user) return { error: "need_login" };
  const seller = await repo.getSellerByUser(user.id);
  if (!seller) return { error: "forbidden" };
  const deal = await repo.getDeal(clean(input.dealId, 64));
  if (!deal || deal.phase !== "bidding") return { error: "pledge_closed" };
  const price = toNum(input.price);
  if (!(price > 0 && price < deal.marketPrice)) return { error: "required" };
  await repo.upsertBid({ dealId: deal.id, sellerId: seller.id, pricePerUnit: Math.round(price), terms: clean(input.terms, 500) });
  return { ok: true };
}

/** Sellers move installs forward up to "subsidy filed"; only the buyer confirms completion. */
export async function sellerSetInstallStage({ repo, user }: Ctx, input: { dealId: string; pledgeId: string; stage: string }): Promise<Result> {
  if (!user) return { error: "need_login" };
  const stage = input.stage as InstallStage;
  const seller = await repo.getSellerByUser(user.id);
  const deal = await repo.getDeal(clean(input.dealId, 64));
  if (!seller || deal?.winningSellerId !== seller.id || !INSTALL_STAGES.includes(stage) || stage === "complete") return { error: "forbidden" };
  const pledges = await repo.listDealPledges(deal.id);
  if (!pledges.some((p) => p.id === input.pledgeId && p.status === "accepted")) return { error: "forbidden" };
  await repo.setInstallStage(input.pledgeId, stage);
  return { ok: true };
}

// ---------- admin ----------
export async function createDeal(
  { repo, user }: Ctx,
  input: { category: string; titleEn: string; titleHi?: string; area: string; city?: string; marketPrice: number | string; target: number | string; deposit: number | string; days: number | string },
): Promise<Result> {
  const err = need(user, ["admin"]);
  if (err) return { error: err };
  const category = clean(input.category, 10) as Category;
  const titleEn = clean(input.titleEn, 120);
  const titleHi = clean(input.titleHi, 120) || titleEn;
  const area = clean(input.area, 80);
  const marketPrice = Math.round(toNum(input.marketPrice));
  const target = Math.round(toNum(input.target));
  const deposit = Math.round(toNum(input.deposit));
  const days = Math.round(toNum(input.days));
  if (!["solar", "car", "tw"].includes(category) || !titleEn || !area || !(marketPrice > 0) || !(target >= 2) || !(deposit >= 0) || !(days >= 1)) {
    return { error: "required" };
  }
  await repo.createDeal({
    category, title: { en: titleEn, hi: titleHi }, area: { en: area, hi: area }, city: clean(input.city, 60) || "Ahmedabad",
    marketPrice, target, deposit, closesAt: new Date(Date.now() + days * 86_400_000).toISOString(), tiers: defaultTiers(marketPrice, target),
  });
  return { ok: true };
}

export async function lockDeal({ repo, user }: Ctx, dealId: string): Promise<Result> {
  const err = need(user, ["admin"]);
  if (err) return { error: err };
  const res = await repo.lockDeal(clean(dealId, 64));
  return res.ok ? { ok: true, message: "lock_ok" } : { error: res.reason === "no_verified_bid" ? "lock_no_bid" : "lock_not_ready" };
}

export async function setVerified({ repo, user }: Ctx, sellerId: string, verified: boolean): Promise<Result> {
  const err = need(user, ["admin"]);
  if (err) return { error: err };
  await repo.setSellerVerified(clean(sellerId, 64), verified);
  return { ok: true };
}

export async function adminSetInstallStage({ repo, user }: Ctx, pledgeId: string, stage: string): Promise<Result> {
  const err = need(user, ["admin"]);
  if (err) return { error: err };
  if (!INSTALL_STAGES.includes(stage as InstallStage)) return { error: "required" };
  await repo.setInstallStage(clean(pledgeId, 64), stage as InstallStage);
  return { ok: true };
}
