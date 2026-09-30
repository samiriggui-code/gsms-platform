import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
	defaultLocale,
	isAppLocale,
	LOCALE_COOKIE,
} from "@/i18n/config";

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		locale?: string;
	} | null;
	const locale = isAppLocale(body?.locale) ? body.locale : defaultLocale;

	const response = NextResponse.json({ ok: true, locale });
	response.cookies.set(LOCALE_COOKIE, locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
	});
	return response;
}

export async function GET() {
	const jar = await cookies();
	const raw = jar.get(LOCALE_COOKIE)?.value;
	const locale = isAppLocale(raw) ? raw : defaultLocale;
	return NextResponse.json({ locale });
}
