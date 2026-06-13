import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "cerw_session";
const GUEST_COOKIE = "cerw_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;

  // Authenticated user on landing or auth pages → redirect to app
  if (
    session &&
    (pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/register/check-email" ||
      pathname === "/verify-email" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password")
  ) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Unauthenticated user on /app or any subpath → redirect to landing (public /events/* is allowed)
  if (!session && pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Public event links: /events/[slug] is allowed without auth (no redirect)
  if (pathname.startsWith("/events/")) {
    return NextResponse.next();
  }

  // Guest landing on /: set guest cookie to track
  if (pathname === "/" && !request.cookies.get(GUEST_COOKIE)) {
    const res = NextResponse.next();
    res.cookies.set(GUEST_COOKIE, "1", {
      path: "/",
      maxAge: GUEST_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/register/check-email",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/app",
    "/app/:path*",
    "/events/:path*",
    "/invites/:path*",
    "/verify-capture/:path*",
  ],
};
