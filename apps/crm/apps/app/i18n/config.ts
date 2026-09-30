export const locales = ["fr", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "fr";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
	return value === "fr" || value === "en";
}
