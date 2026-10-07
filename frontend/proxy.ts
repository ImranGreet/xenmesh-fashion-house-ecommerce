import { NextRequest, NextResponse } from "next/server";

const apiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return false;
  }

  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { cookie },
    cache: "no-store",
  });
  return response.ok;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isHome = pathname === "/";
  let authenticated: boolean;
  try {
    authenticated = await hasValidSession(request);
  } catch {
    return NextResponse.json(
      { message: "Authentication service is unavailable." },
      { status: 503 },
    );
  }

  if (isLogin) {
    return authenticated
      ? NextResponse.redirect(new URL("/admin", request.url))
      : NextResponse.next();
  }

  if (isHome && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isHome) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
