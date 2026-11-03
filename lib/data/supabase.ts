import { supabaseServer } from "../supabase/server";
import { createSupabaseRepo } from "./supabase-repo";

export const supabaseRepo = () => createSupabaseRepo(supabaseServer());
