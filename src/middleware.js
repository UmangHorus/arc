// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const isEmployee = request.cookies.get("isEmployee")?.value === "true";
  const expiry = request.cookies.get("expiry")?.value;

  const authRoutes = ["/login", "/"];
  const employeeOnlyRoutes = ["/dashboard", "/settings"];
  const protectedRoutes = ["/leads", ...employeeOnlyRoutes];

  // 0. Expiry check against real server time
  if (token && expiry) {
    const now = Date.now();
    if (now > Number(expiry)) {
      const response = NextResponse.redirect(new URL("/login", origin));
      response.cookies.delete("token");
      response.cookies.delete("isEmployee");
      response.cookies.delete("expiry");
      return response;
    }
  }

  // Allow registration flow
  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.get("step") === "register"
  ) {
    return NextResponse.next();
  }

  // 1. Redirect authenticated users away from auth pages
  if (token && authRoutes.includes(pathname)) {
    const defaultRedirect = isEmployee ? "/dashboard" : "/leads";
    return NextResponse.redirect(new URL(defaultRedirect, origin));
  }

  // 2. Protect routes - redirect unauthenticated users
  if (!token && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(pathname)}`, origin)
    );
  }

  // 3. Employee-only restrictions
  if (
    token &&
    !isEmployee &&
    employeeOnlyRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/leads", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
};
