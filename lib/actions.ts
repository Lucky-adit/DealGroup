"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { repo, isDemo } from "./data";
import { LANG_COOKIE } from "./i18n";
import { normalizeIndianPhone } from "./pricing";
import * as svc from "./services";
import { DEMO_COOKIE, DEMO_USERS, getSessionUser } from "./session";
import { supabaseServer } from "./supabase/server";
import type { Role } from "./types";

export type ActionState = svc.Result;

const f = (d: FormData, k: string) => String(d.get(k) ?? "");
const ctx = async () => ({ repo: repo(), user: await getSessionUser() });
const refresh = () => revalidatePath("/", "layout");

// ---------- language & sign-in ----------
export async function setLang(formData: FormData) {
  cookies().set(LANG_COOKIE, formData.get("lang") === "hi" ? "hi" : "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  refresh();
}

export async function demoLogin(formData: FormData) {
  if (!isDemo()) return;
  const role = f(formData, "role") as Role;
  if (!DEMO_USERS[role]) return;
  cookies().set(DEMO_COOKIE, role, { path: "/", sameSite: "lax", httpOnly: true });
  redirect(role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/");
}

export async function logout() {
  if (isDemo()) cookies().delete(DEMO_COOKIE);
  else await supabaseServer().auth.signOut();
  redirect("/");
}

export async function sendOtp(_: ActionState, formData: FormData): Promise<ActionState> {
  const phone = normalizeIndianPhone(f(formData, "phone"));
  if (!phone) return { error: "bad_phone" };
  const { error } = await supabaseServer().auth.signInWithOtp({ phone });
  return error ? { error: "error" } : { ok: true, message: phone };
}

export async function verifyOtp(_: ActionState, formData: FormData): Promise<ActionState> {
  const phone = normalizeIndianPhone(f(formData, "phone"));
  const token = f(formData, "code").trim();
  if (!phone || !/^\d{6}$/.test(token)) return { error: "bad_code" };
  const { error } = await supabaseServer().auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { error: "bad_code" };
  redirect("/");
}

// ---------- buyers ----------
export async function pledge(_: ActionState, d: FormData) {
  const r = await svc.pledge(await ctx(), { dealId: f(d, "dealId"), name: f(d, "name"), phone: f(d, "phone"), quantity: f(d, "quantity") });
  refresh();
  return r;
}
export async function withdraw(d: FormData) {
  await svc.withdraw(await ctx(), f(d, "dealId"));
  refresh();
}
export async function respondToLock(d: FormData) {
  await svc.respondToLock(await ctx(), f(d, "pledgeId"), f(d, "accept") === "yes");
  refresh();
}
export async function requestDeal(_: ActionState, d: FormData) {
  const r = await svc.requestDeal(await ctx(), { product: f(d, "product"), city: f(d, "city"), quantity: f(d, "quantity"), budget: f(d, "budget") });
  refresh();
  return r;
}
export async function confirmInstall(d: FormData) {
  await svc.confirmInstall(await ctx(), f(d, "pledgeId"));
  refresh();
}
export async function review(_: ActionState, d: FormData) {
  const r = await svc.review(await ctx(), { pledgeId: f(d, "pledgeId"), rating: f(d, "rating"), comment: f(d, "comment") });
  refresh();
  return r;
}

// ---------- sellers ----------
export async function saveSeller(_: ActionState, d: FormData) {
  const r = await svc.saveSeller(await ctx(), { company: f(d, "company"), gst: f(d, "gst"), empanelment: f(d, "empanelment"), city: f(d, "city") });
  refresh();
  return r;
}
export async function placeBid(_: ActionState, d: FormData) {
  const r = await svc.placeBid(await ctx(), { dealId: f(d, "dealId"), price: f(d, "price"), terms: f(d, "terms") });
  refresh();
  return r;
}
export async function sellerSetInstallStage(d: FormData) {
  await svc.sellerSetInstallStage(await ctx(), { dealId: f(d, "dealId"), pledgeId: f(d, "pledgeId"), stage: f(d, "stage") });
  refresh();
}

// ---------- admin ----------
export async function createDeal(_: ActionState, d: FormData) {
  const r = await svc.createDeal(await ctx(), {
    category: f(d, "category"), titleEn: f(d, "titleEn"), titleHi: f(d, "titleHi"), area: f(d, "area"), city: f(d, "city"),
    marketPrice: f(d, "marketPrice"), target: f(d, "target"), deposit: f(d, "deposit"), days: f(d, "days"),
  });
  refresh();
  return r;
}
export async function lockDeal(_: ActionState, d: FormData): Promise<ActionState> {
  const r = await svc.lockDeal(await ctx(), f(d, "dealId"));
  if (!r?.ok) return r;
  refresh();
  redirect("/admin?notice=lock_ok"); // the lock button disappears once locked, so confirm on the page itself
}
export async function setVerified(d: FormData) {
  await svc.setVerified(await ctx(), f(d, "sellerId"), f(d, "verified") === "yes");
  refresh();
}
export async function adminSetInstallStage(d: FormData) {
  await svc.adminSetInstallStage(await ctx(), f(d, "pledgeId"), f(d, "stage"));
  refresh();
}
