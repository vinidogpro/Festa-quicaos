import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient() {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    const nextCount = ((window as any).__authDebugClientCreateCount ?? 0) + 1;
    (window as any).__authDebugClientCreateCount = nextCount;
    console.log("[auth-debug][browser-client] createSupabaseBrowserClient", {
      count: nextCount,
      pathname: window.location.pathname
    });
  }

  return createClientComponentClient<Database>();
}
