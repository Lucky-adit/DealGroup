"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { repo, isDemo } from "./data";
import { LANG_COOKIE } from "./i18n";
import { defaultTiers, normalizeIndianPhone } from "./pricing";
import { DEMO_COOKIE, DEMO_USERS, getSessionUser } from "./session";
import { supabaseServer } from "./supabase/server";
import { INSTALL_STAGES, type Category, type InstallStage, type Role } from "./types";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => {
  const n = Number(f.get(k));
  return Number.isFinite(n) ? n : NaN;
};

async function requireUser(roles?: Role[]) {
  const user = await getSessionUser();
  if (!user) return { user: null, error: "need_login" } as const;
  if (roles && !roles.includes(user.role)) return { user: null, error: "forbidden" } as const;
  return { user, error: null } as const;
}

// ---------- language & demo login ----------
export async function setLang(formData: FormData) {
  const lang = formData.get("lang") === "hi" ? "hi" : "en";
  cookies().set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function demoLogin(formData: FormData) {
  if (!isDemo()) return;
  const role = String(formData.get("role")) as Role;
  if (!DEMO_USERS[role]) return;
  cookies().set(DEMO_COOKIE, role, { path: "/", sameSite: "lax", httpOnly: true });
  redirect(role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/");
}

export async function logout() {
  if (isDemo()) cookies().delete(DEMO_COOKIE);
  else await supabaseServer().auth.signOut();
  redirect("/");
}

// ---------- phone OTP (Supabase) ----------
export async function sendOtp(_: ActionState, formData: FormData): Promise<ActionState> {
  const phone = normalizeIndianPhone(str(formData, "phone", 20));
  if (!phone) return { error: "bad_phone" };
  const { error } = await supabaseServer().auth.signInWithOtp({ phone });
  return error ? { error: "error" } : { ok: true, message: phone };
}

export async function verifyOtp(_: ActionState, formData: FormData): Promise<ActionState> {
  const phone = normalizeIndianPhone(str(formData, "phone", 20));
  const token = str(formData, "code", 6);
  if (!phone || !/^\d{6}$/.test(token)) return { error: "bad_code" };
  const { error } = await supabaseServer().auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { error: "bad_code" };
  redirect("/");
}

// ---------- buyers ----------
export async function pledge(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser();
  if (!user) return { error };
  const dealId = str(formData, "dealId", 64);
  const name = str(formData, "name", 80);
  const phone = normalizeIndianPhone(str(formData, "phone", 20));
  const quantity = Math.round(num(formData, "quantity"));
  if (!name) return { error: "required" };
  if (!phone) return { error: "bad_phone" };
  if (!(quantity >= 1 && quantity <= 5)) return { error: "required" };
  const deal = await repo().getDeal(dealId);
  if (!deal || deal.phase !== "pledging" && deal.phase !== "bidding") return { error: "pledge_closed" };
  await repo().upsertPledge({ dealId, userId: user.id, quantity, name, phone });
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function withdraw(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;
  const dealId = str(formData, "dealId", 64);
  const deal = await repo().getDeal(dealId);
  if (!deal || deal.phase === "locked") return;
  await repo().withdrawPledge(dealId, user.id);
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/");
}

export async function respondToLock(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;
  const pledgeId = str(formData, "pledgeId", 64);
  await repo().respondToLock(pledgeId, user.id, formData.get("accept") === "yes");
  revalidatePath("/", "layout");
}

export async function requestDeal(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser();
  if (!user) return { error };
  const product = str(formData, "product", 120);
  const city = str(formData, "city", 60) || "Ahmedabad";
  const quantity = Math.max(1, Math.min(100, Math.round(num(formData, "quantity")) || 1));
  const budgetRaw = num(formData, "budget");
  if (!product) return { error: "required" };
  await repo().createRequest({ userId: user.id, product, city, quantity, budget: budgetRaw > 0 ? budgetRaw : null });
  revalidatePath("/requests");
  return { ok: true };
}

export async function confirmInstall(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;
  const pledgeId = str(formData, "pledgeId", 64);
  const mine = (await repo().listMyPledges(user.id)).find((p) => p.id === pledgeId);
  if (!mine || mine.install?.stage !== "subsidy_filed") return;
  await repo().setInstallStage(pledgeId, "complete");
  revalidatePath("/me");
}

export async function review(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser();
  if (!user) return { error };
  const pledgeId = str(formData, "pledgeId", 64);
  const rating = Math.round(num(formData, "rating"));
  if (!(rating >= 1 && rating <= 5)) return { error: "required" };
  const mine = (await repo().listMyPledges(user.id)).find((p) => p.id === pledgeId);
  if (!mine || mine.install?.stage !== "complete") return { error: "forbidden" };
  await repo().addReview({ pledgeId, userId: user.id, rating, comment: str(formData, "comment", 1000) });
  revalidatePath("/me");
  return { ok: true };
}

// ---------- sellers ----------
export async function saveSeller(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser(["seller", "admin", "buyer"]);
  if (!user) return { error };
  const company = str(formData, "company", 120);
  const gstNumber = str(formData, "gst", 15).toUpperCase();
  const empanelmentId = str(formData, "empanelment", 60);
  const city = str(formData, "city", 60) || "Ahmedabad";
  if (!company || !gstNumber || !empanelmentId) return { error: "required" };
  await repo().upsertSeller({ userId: user.id, company, gstNumber, empanelmentId, city });
  revalidatePath("/seller");
  return { ok: true };
}

export async function placeBid(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser();
  if (!user) return { error };
  const seller = await repo().getSellerByUser(user.id);
  if (!seller) return { error: "forbidden" };
  const dealId = str(formData, "dealId", 64);
  const price = num(formData, "price");
  const deal = await repo().getDeal(dealId);
  if (!deal || deal.phase !== "bidding") return { error: "pledge_closed" };
  if (!(price > 0 && price < deal.marketPrice)) return { error: "required" };
  await repo().upsertBid({ dealId, sellerId: seller.id, pricePerUnit: Math.round(price), terms: str(formData, "terms", 500) });
  revalidatePath("/seller");
  return { ok: true };
}

export async function sellerSetInstallStage(formData: FormData) {
  const { user } = await requireUser();
  if (!user) return;
  const seller = await repo().getSellerByUser(user.id);
  const dealId = str(formData, "dealId", 64);
  const deal = await repo().getDeal(dealId);
  const stage = str(formData, "stage", 20) as InstallStage;
  // Sellers move installs forward up to "subsidy filed"; only the buyer confirms completion.
  if (!seller || deal?.winningSellerId !== seller.id || !INSTALL_STAGES.includes(stage) || stage === "complete") return;
  const pledges = await repo().listDealPledges(dealId);
  const pledgeId = str(formData, "pledgeId", 64);
  if (!pledges.some((p) => p.id === pledgeId && p.status === "accepted")) return;
  await repo().setInstallStage(pledgeId, stage);
  revalidatePath("/seller");
}

// ---------- admin ----------
export async function createDeal(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser(["admin"]);
  if (!user) return { error };
  const category = str(formData, "category", 10) as Category;
  const titleEn = str(formData, "titleEn", 120);
  const titleHi = str(formData, "titleHi", 120) || titleEn;
  const area = str(formData, "area", 80);
  const city = str(formData, "city", 60) || "Ahmedabad";
  const marketPrice = Math.round(num(formData, "marketPrice"));
  const target = Math.round(num(formData, "target"));
  const deposit = Math.round(num(formData, "deposit"));
  const days = Math.round(num(formData, "days"));
  if (!["solar", "car", "tw"].includes(category) || !titleEn || !area || !(marketPrice > 0) || !(target >= 2) || !(deposit >= 0) || !(days >= 1)) {
    return { error: "required" };
  }
  await repo().createDeal({
    category, title: { en: titleEn, hi: titleHi }, area: { en: area, hi: area }, city, marketPrice, target, deposit,
    closesAt: new Date(Date.now() + days * 86_400_000).toISOString(), tiers: defaultTiers(marketPrice, target),
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function lockDeal(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error } = await requireUser(["admin"]);
  if (!user) return { error };
  const res = await repo().lockDeal(str(formData, "dealId", 64));
  if (!res.ok) return { error: res.reason === "no_verified_bid" ? "lock_no_bid" : "lock_not_ready" };
  revalidatePath("/", "layout");
  redirect("/admin?notice=lock_ok"); // the lock button disappears once locked, so confirm on the page itself
}

export async function setVerified(formData: FormData) {
  const { user } = await requireUser(["admin"]);
  if (!user) return;
  await repo().setSellerVerified(str(formData, "sellerId", 64), formData.get("verified") === "yes");
  revalidatePath("/admin");
}

export async function adminSetInstallStage(formData: FormData) {
  const { user } = await requireUser(["admin"]);
  if (!user) return;
  const stage = str(formData, "stage", 20) as InstallStage;
  if (!INSTALL_STAGES.includes(stage)) return;
  await repo().setInstallStage(str(formData, "pledgeId", 64), stage);
  revalidatePath("/admin");
}
