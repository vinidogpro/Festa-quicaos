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
    url.searchParams.set("next", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (session && req.nextUrl.pathname === "/login") {
    const nextPath = req.nextUrl.searchParams.get("next") || "/";
    const safePath = nextPath.startsWith("/") ? nextPath : "/";
    return NextResponse.redirect(new URL(safePath, req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"]
};
