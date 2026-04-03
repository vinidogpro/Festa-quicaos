import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient() {
  return createClientComponentClient<Database>();
}
