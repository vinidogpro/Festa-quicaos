import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/env";

const publicRoutes = ["/login"];
const authDebugEnabled = process.env.NODE_ENV !== "production";

function hasSupabaseAuthCookie(req: NextRequest) {
  return req.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return name.includes("sb-") || name.includes("supabase");
  });
}

export async function middleware(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  const hasAuthCookie = hasSupabaseAuthCookie(req);

  if (authDebugEnabled) {
    console.log("[auth-debug][middleware] start", {
      pathname: req.nextUrl.pathname,
      isPublicRoute,
      hasAuthCookie
    });
  }

  const res = NextResponse.next();

  if (isPublicRoute && !hasAuthCookie) {
    if (authDebugEnabled) {
      console.log("[auth-debug][middleware] skip getSession on public route without auth cookie", {
        pathname: req.nextUrl.pathname
      });
    }

    return res;
  }

  const supabase = createMiddlewareClient<Database>({ req, res });

  if (authDebugEnabled) {
    console.log("[auth-debug][middleware] calling auth.getSession", {
      pathname: req.nextUrl.pathname
    });
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (authDebugEnabled) {
    console.log("[auth-debug][middleware] auth.getSession resolved", {
      pathname: req.nextUrl.pathname,
      hasSession: Boolean(session)
    });
  }

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
