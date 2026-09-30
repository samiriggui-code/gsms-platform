import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
	defaultLocale,
	isAppLocale,
	LOCALE_COOKIE,
	type AppLocale,
} from "./config";

async function loadMessages(locale: AppLocale) {
	switch (locale) {
		case "fr":
			return (await import("../messages/fr.json")).default;
		case "en":
			return (await import("../messages/en.json")).default;
		default: {
			const _exhaustive: never = locale;
			return _exhaustive;
		}
	}
}

export default getRequestConfig(async () => {
	const jar = await cookies();
	const raw = jar.get(LOCALE_COOKIE)?.value;
	const locale: AppLocale = isAppLocale(raw) ? raw : defaultLocale;

	return {
		locale,
		messages: await loadMessages(locale),
	};
});
