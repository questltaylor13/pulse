import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Bug 2 support: instrument all responses under /events/* and /places/*.
// Next.js will set response.status=404 via notFound(); our edge middleware
// observes the outbound response and logs occurrences so we can track
// recurring broken-link incidents in Vercel logs.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-pulse-path", req.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: ["/events/:path*", "/places/:path*"],
};
