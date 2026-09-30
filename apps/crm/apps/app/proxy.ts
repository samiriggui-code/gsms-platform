import { type NextRequest, NextResponse } from "next/server";
import { isMarketing } from "@/lib/env";
import {
	ONBOARDING_PATH,
	RESEARCH_PATH,
	readResearchGate,
	readWorkspaceGate,
} from "@/lib/onboarding";
import { workspaceUrl } from "@/lib/workspace-url";

const LANDING_PATH = "/";

const SIGN_IN_PATH = "/sign-in";

const UNGATED = ["/grant-access", "/eve"];

const ANONYMOUS = ["/t"];

const MARKETING_PUBLIC = ["/", "/demande", "/prestations"];

const SECTIONS = ["/companies", "/contacts", "/deals", "/trust", "/settings"];

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (pathname === SIGN_IN_PATH) return NextResponse.next();

	if (isAnonymous(pathname)) return NextResponse.next();

	if (!hasSessionCookie(request)) {
		return isPublic(pathname)
			? NextResponse.next()
			: NextResponse.redirect(new URL(SIGN_IN_PATH, request.nextUrl));
	}

	if (isUngated(pathname)) return NextResponse.next();

	// Both answers, every time, and concurrently — so the gate costs one round
	// trip rather than two, and neither answer can be stale.
	const [workspace, research] = await Promise.all([
		readWorkspaceGate(request),
		readResearchGate(request),
	]);

	if (workspace.gate === "required") return sendTo(ONBOARDING_PATH, request);
	if (research === "required") return sendTo(RESEARCH_PATH, request);

	const settled = workspace.gate === "settled" && research === "settled";

	if (!settled || !workspace.slug) return NextResponse.next();

	return sendTo(appPath(pathname, workspace.slug), request);
}

function appPath(pathname: string, slug: string): string {
	if (pathname === LANDING_PATH || isSetup(pathname)) {
		return workspaceUrl(slug);
	}

	if (SECTIONS.some((section) => isUnder(pathname, section))) {
		return workspaceUrl(slug, pathname);
	}

	const [first, ...rest] = pathname.slice(1).split("/");

	if (first === slug) return pathname;

	return workspaceUrl(slug, rest.length ? `/${rest.join("/")}` : "/");
}

function hasSessionCookie(request: NextRequest): boolean {
	return (
		request.cookies.has("next-auth.session-token") ||
		request.cookies.has("__Secure-next-auth.session-token")
	);
}

function isUnder(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublic(pathname: string): boolean {
	if (!isMarketing()) return false;
	return MARKETING_PUBLIC.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);
}

function isUngated(pathname: string): boolean {
	return UNGATED.some((prefix) => isUnder(pathname, prefix));
}

function isAnonymous(pathname: string): boolean {
	return ANONYMOUS.some((prefix) => isUnder(pathname, prefix));
}

function isSetup(pathname: string): boolean {
	return pathname === ONBOARDING_PATH || pathname === RESEARCH_PATH;
}

function sendTo(path: string, request: NextRequest): NextResponse {
	if (request.nextUrl.pathname === path) return NextResponse.next();

	const url = new URL(path, request.nextUrl);
	url.search = request.nextUrl.search;

	return NextResponse.redirect(url);
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|webmanifest)$).*)",
	],
};
