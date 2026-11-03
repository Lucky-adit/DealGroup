import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, translator } from "./i18n";
import type { Lang } from "./types";

export function getLang(): Lang {
  return cookies().get(LANG_COOKIE)?.value === "hi" ? "hi" : "en";
}
export function getT() {
  const lang = getLang();
  return { lang, t: translator(lang) };
}
