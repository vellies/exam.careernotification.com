import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/src/lib/auth/session";
import { getAccountState } from "@/src/lib/auth/account-status";
import { can, isAdminRole, type Action, type AdminAccess, type Resource } from "@/src/lib/auth/permissions";

const SESSION_COOKIE = "cn_session";

const STUDENT_PATHS = ["/overview", "/series", "/my-tests", "/my-results", "/bookmarks", "/profile"];
const isStudentPath = (pathname: string) =>
  pathname.startsWith("/tests/") ||
  STUDENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** First path segment under /admin → the permission area its pages belong to. */
const ADMIN_SECTIONS: Record<string, Resource> = {
  exams: "exams",
  syllabus: "syllabus",
  questions: "questions",
  ocr: "questions",
  "test-series": "testSeries",
  tests: "tests",
  purchases: "purchases",
  users: "users",
  reports: "reports",
};

/**
 * The permission an admin page needs: list pages need read, "new"/"import"
 * pages and OCR need create, and record pages (/admin/x/<id>/...) need update.
 * Null means any admin may open it (e.g. the dashboard).
 */
function requiredPermission(pathname: string): [Resource, Action] | null {
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const resource = ADMIN_SECTIONS[segments[0] ?? ""];
  if (!resource) return null;
  if (segments[0] === "ocr") return [resource, "create"];
  // Skip sub-sections like /admin/exams/categories or /admin/syllabus/subjects.
  const rest = segments.slice(1).filter((s) => s !== "categories" && s !== "subjects");
  if (rest.length === 0) return [resource, "read"];
  if (rest[0] === "new" || rest[0] === "import") return [resource, "create"];
  return [resource, "update"];
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Sessions are stateless JWTs — this is a live check so a user the admin
  // just disabled is logged out on their very next request, and role or
  // permission changes apply straight away.
  const state = session ? await getAccountState(session.sub) : null;
  if (session && !state?.active) {
    const url = new URL("/login", request.url);
    url.searchParams.set("reason", "disabled");
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const isStaff = isAdminRole(state?.role);
  const home = isStaff ? "/admin/dashboard" : "/overview";

  if (pathname.startsWith("/admin")) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!isStaff) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    const needed = requiredPermission(pathname);
    if (needed && !can(state as AdminAccess, ...needed)) {
      const url = new URL("/admin/dashboard", request.url);
      url.searchParams.set("denied", "1");
      return NextResponse.redirect(url);
    }
  }

  if (isStudentPath(pathname)) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (isStaff) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // The home page is the login page: visitors go to login, signed-in users to their own area.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? home : "/login", request.url));
  }

  if (["/login", "/signup"].includes(pathname) && session) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/overview",
    "/series/:path*",
    "/my-tests",
    "/my-results/:path*",
    "/bookmarks",
    "/profile",
    "/tests/:path*",
    "/login",
    "/signup",
  ],
};
