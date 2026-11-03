import "server-only";
import { cookies } from "next/headers";
import { supabaseConfigured, supabaseServer } from "./supabase/server";
import type { Role, SessionUser } from "./types";

export const DEMO_COOKIE = "dg_demo_user";

/** Demo users: one per role, so every screen can be tried without a login provider. */
export const DEMO_USERS: Record<Role, SessionUser> = {
  buyer: { id: "demo-buyer", role: "buyer", phone: "+919800000000", name: "Demo Buyer" },
  seller: { id: "demo-seller", role: "seller", phone: "+919800000001", name: "Demo Seller" },
  admin: { id: "demo-admin", role: "admin", phone: "+919800000002", name: "Demo Admin" },
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!supabaseConfigured()) {
    const role = cookies().get(DEMO_COOKIE)?.value as Role | undefined;
    return role && DEMO_USERS[role] ? DEMO_USERS[role] : null;
  }
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await sb.from("profiles").select("role, name").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, role: (profile?.role as Role) ?? "buyer", phone: data.user.phone ?? null, name: profile?.name ?? null };
}
