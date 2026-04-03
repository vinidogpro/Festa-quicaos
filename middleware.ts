import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/env";

const publicRoutes = ["/login"];

export async function middleware(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));

  if (!session && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && req.nextUrl.pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
