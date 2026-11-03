import "server-only";
import { supabaseConfigured } from "../supabase/server";
import { demoRepo } from "./demo";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase";

export const isDemo = () => !supabaseConfigured();
export const repo = (): Repo => (isDemo() ? demoRepo : supabaseRepo());
