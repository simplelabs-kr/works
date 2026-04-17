import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ALLOWED_EMAIL_DOMAIN = "@simplelabs.kr";

export async function middleware(req: NextRequest) {
  // Local development bypass — no Supabase session cookie exists
  // when running `next dev`, so the guard would otherwise loop to /login.
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const email = user.email ?? "";
  if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    if (isApi) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const unauthorizedUrl = new URL("/unauthorized", req.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return res;
}

// Matcher: protect /works and everything under /api.
// /login, /auth/callback, /unauthorized are intentionally excluded so they
// stay reachable without a session.
export const config = {
  matcher: ["/works/:path*", "/api/:path*"],
};
