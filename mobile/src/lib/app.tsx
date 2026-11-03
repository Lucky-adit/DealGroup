import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoRepo } from "@shared/data/demo";
import type { Repo } from "@shared/data/repo";
import { createSupabaseRepo } from "@shared/data/supabase-repo";
import { translator, type T } from "@shared/i18n";
import type { Result } from "@shared/services";
import type { Lang, Role, SessionUser } from "@shared/types";
import { supabase } from "./supabase";

const LANG_KEY = "dg_lang";
const DEMO_KEY = "dg_demo_role";

export const DEMO_USERS: Record<Role, SessionUser> = {
  buyer: { id: "demo-buyer", role: "buyer", phone: "+919800000000", name: "Demo Buyer" },
  seller: { id: "demo-seller", role: "seller", phone: "+919800000001", name: "Demo Seller" },
  admin: { id: "demo-admin", role: "admin", phone: "+919800000002", name: "Demo Admin" },
};

type Ctx = {
  repo: Repo;
  isDemo: boolean;
  user: SessionUser | null;
  ready: boolean;
  lang: Lang;
  t: T;
  setLang: (l: Lang) => void;
  /** Bumps after every change so screens refetch. */
  version: number;
  /** Run a shared service and refresh data on success. */
  run: (fn: (ctx: { repo: Repo; user: SessionUser | null }) => Promise<Result>) => Promise<Result>;
  demoLogin: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const isDemo = !supabase;
  const repo = useMemo<Repo>(() => (supabase ? createSupabaseRepo(supabase) : demoRepo), []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(getLocales()[0]?.languageCode === "hi" ? "hi" : "en");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => v === "hi" || v === "en" ? setLangState(v) : null).catch(() => {});
  }, []);

  // Session: demo role from storage, or Supabase auth + profile role.
  useEffect(() => {
    if (!supabase) {
      AsyncStorage.getItem(DEMO_KEY)
        .then((r) => setUser(r && DEMO_USERS[r as Role] ? DEMO_USERS[r as Role] : null))
        .catch(() => {})
        .finally(() => setReady(true));
      return;
    }
    const sb = supabase;
    const load = async (uid: string | undefined, phone: string | undefined) => {
      if (!uid) return setUser(null);
      const { data } = await sb.from("profiles").select("role, name").eq("id", uid).maybeSingle();
      setUser({ id: uid, role: (data?.role as Role) ?? "buyer", phone: phone ?? null, name: data?.name ?? null });
    };
    sb.auth.getSession().then(({ data }) => load(data.session?.user.id, data.session?.user.phone)).finally(() => setReady(true));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      load(session?.user.id, session?.user.phone);
      setVersion((v) => v + 1);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const run = useCallback<Ctx["run"]>(async (fn) => {
    try {
      const r = await fn({ repo, user });
      setVersion((v) => v + 1);
      return r;
    } catch {
      return { error: "error" };
    }
  }, [repo, user]);

  const demoLogin = useCallback(async (role: Role) => {
    await AsyncStorage.setItem(DEMO_KEY, role).catch(() => {});
    setUser(DEMO_USERS[role]);
    setVersion((v) => v + 1);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    else await AsyncStorage.removeItem(DEMO_KEY).catch(() => {});
    setUser(null);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo<Ctx>(() => ({
    repo, isDemo, user, ready, lang, t: translator(lang), setLang, version, run, demoLogin, signOut,
  }), [repo, isDemo, user, ready, lang, setLang, version, run, demoLogin, signOut]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

/** Load data and reload whenever anything changes (version bump) or deps change. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const { version } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .then((d) => alive && (setData(d), setError(false)))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, ...deps]);
  return { data, error, loading, reload: () => setTick((x) => x + 1) };
}
