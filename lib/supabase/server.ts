import {
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/lib/supabase/database.types";

export function createSupabaseServerClient() {
  return createServerComponentClient<Database>({ cookies });
}

export function createSupabaseActionClient() {
  return createServerActionClient<Database>({ cookies });
}

export function createSupabaseRouteClient() {
  return createRouteHandlerClient<Database>({ cookies });
}
