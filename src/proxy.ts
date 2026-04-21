import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/app", "/session"];
const PROTECTED_API = ["/api/sessions", "/api/chat", "/api/agents", "/api/voice", "/api/providers"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtectedPage = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_API.some((p) => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) return NextResponse.next();

  const token = req.cookies.get("mirror_session")?.value;
  if (!token) {
    if (isProtectedApi) return new NextResponse("Unauthorized", { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/session/:path*",
    "/api/sessions/:path*",
    "/api/chat",
    "/api/agents/:path*",
    "/api/voice/:path*",
    "/api/providers",
  ],
};
