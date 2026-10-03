"use client";

import { useLocale, useTranslations } from "next-intl";
import { InlineScript } from "./inline-script";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const LOCAL_DAY_OPTIONS = {
	month: "short",
	day: "numeric",
	year: "numeric",
} as const;
const LOCAL_DATE_TIME_SCRIPT = `{var s="time[data-local-date-kind]",f=function(n){try{var k=n.dataset.localDateKind,v=n.dataset.localDateValue,e=n.dataset.localDateEnd,l=n.dataset.localDateLocale||void 0,w=JSON.parse(n.dataset.localDateWords||"{}"),o=JSON.parse(n.dataset.localDateOptions||"{}"),d=new Date(v),t=d.getTime(),x=Date.now()-t,a=Math.abs(x),r;if(k==="date-time")r=new Intl.DateTimeFormat(l,o).format(d);else if(k==="date-range")r=new Intl.DateTimeFormat(l,o).formatRange(d,new Date(e));else if(k==="day")r=new Intl.DateTimeFormat(l,o).format(new Date(v+"T00:00:00"));else if(k==="relative-date"){var z=new Date(),q=(Date.UTC(z.getFullYear(),z.getMonth(),z.getDate())-Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))/${DAY_MS};r=new Intl.RelativeTimeFormat(l,{numeric:"auto"}).format(-q,"day")}else if(!Number.isFinite(t))r="—";else if(a<${MINUTE_MS})r=w.justNow||"just now";else if(a>=${30 * DAY_MS})r=new Intl.DateTimeFormat(l,{month:"short",day:"numeric"}).format(d);else{var u=a<${HOUR_MS}?Math.floor(a/${MINUTE_MS})+(w.m||"m"):a<${DAY_MS}?Math.floor(a/${HOUR_MS})+(w.h||"h"):Math.floor(a/${DAY_MS})+(w.d||"d");r=(x<0?w.future||"in {d}":w.past||"{d} ago").replace("{d}",u)}n.textContent=r}catch{}};var c=function(r){if(r.nodeType===1&&r.matches&&r.matches(s))f(r);if(r.querySelectorAll)r.querySelectorAll(s).forEach(f)};c(document);new MutationObserver(function(m){m.forEach(function(r){r.addedNodes.forEach(c)})}).observe(document.documentElement,{childList:true,subtree:true})}`;

type RelativeWords = {
	justNow: string;
	m: string;
	h: string;
	d: string;
	past: string;
	future: string;
};

const DISTANCE_TOKEN = "{d}";

export function LocalDateTime({
	date,
	options,
}: {
	date: string;
	options: Intl.DateTimeFormatOptions;
}) {
	const locale = useLocale();
	return (
		<LocalTime
			kind="date-time"
			date={date}
			locale={locale}
			options={options}
			fallback={getDateTimeFormatter(locale, options).format(new Date(date))}
		/>
	);
}

export function LocalDateTimeRange({
	start,
	end,
	options,
}: {
	start: string;
	end: string;
	options: Intl.DateTimeFormatOptions;
}) {
	const locale = useLocale();
	return (
		<LocalTime
			kind="date-range"
			date={start}
			end={end}
			locale={locale}
			options={options}
			fallback={getDateTimeFormatter(locale, options).formatRange(
				new Date(start),
				new Date(end),
			)}
		/>
	);
}

export function LocalRelativeDate({ date }: { date: string }) {
	const locale = useLocale();
	return (
		<LocalTime
			kind="relative-date"
			date={date}
			locale={locale}
			fallback={formatRelativeDate(locale, date)}
		/>
	);
}

export function LocalRelativeTime({ date }: { date: string }) {
	const locale = useLocale();
	const t = useTranslations("shellTime");
	const words: RelativeWords = {
		justNow: t("justNow"),
		m: t("minuteUnit"),
		h: t("hourUnit"),
		d: t("dayUnit"),
		past: t("past", { distance: DISTANCE_TOKEN }),
		future: t("future", { distance: DISTANCE_TOKEN }),
	};
	return (
		<LocalTime
			kind="relative-time"
			date={date}
			locale={locale}
			words={words}
			fallback={formatRelativeTime(locale, words, date)}
		/>
	);
}

export function LocalDay({ date }: { date: string }) {
	const locale = useLocale();
	const day = date.slice(0, 10);
	return (
		<LocalTime
			kind="day"
			date={day}
			locale={locale}
			options={LOCAL_DAY_OPTIONS}
			fallback={getDateTimeFormatter(locale, LOCAL_DAY_OPTIONS).format(
				dayDate(day),
			)}
		/>
	);
}

export function LocalDateTimeHydrator() {
	return <InlineScript html={LOCAL_DATE_TIME_SCRIPT} />;
}

function LocalTime({
	kind,
	date,
	end,
	locale,
	words,
	options,
	fallback,
}: {
	kind: "date-time" | "date-range" | "day" | "relative-date" | "relative-time";
	date: string;
	end?: string;
	locale: string;
	words?: RelativeWords;
	options?: Intl.DateTimeFormatOptions;
	fallback: string;
}) {
	return (
		<time
			dateTime={date}
			data-local-date-kind={kind}
			data-local-date-value={date}
			data-local-date-end={end}
			data-local-date-locale={locale}
			data-local-date-words={words ? JSON.stringify(words) : undefined}
			data-local-date-options={options ? JSON.stringify(options) : undefined}
			suppressHydrationWarning
		>
			{fallback}
		</time>
	);
}

function formatRelativeDate(locale: string, date: string): string {
	const now = new Date();
	const then = new Date(date);
	const days = (calendarDay(now) - calendarDay(then)) / DAY_MS;
	return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
		-days,
		"day",
	);
}

function formatRelativeTime(
	locale: string,
	words: RelativeWords,
	date: string,
): string {
	const then = new Date(date).getTime();
	if (!Number.isFinite(then)) return "—";
	const difference = Date.now() - then;
	const absolute = Math.abs(difference);
	if (absolute < MINUTE_MS) return words.justNow;
	if (absolute >= 30 * DAY_MS) {
		return getDateTimeFormatter(locale, {
			month: "short",
			day: "numeric",
		}).format(new Date(then));
	}

	const distance =
		absolute < HOUR_MS
			? `${Math.floor(absolute / MINUTE_MS)}${words.m}`
			: absolute < DAY_MS
				? `${Math.floor(absolute / HOUR_MS)}${words.h}`
				: `${Math.floor(absolute / DAY_MS)}${words.d}`;
	return (difference < 0 ? words.future : words.past).replace(
		DISTANCE_TOKEN,
		distance,
	);
}

function calendarDay(date: Date): number {
	return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDate(day: string): Date {
	return new Date(`${day}T00:00:00`);
}

function getDateTimeFormatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const key = `${locale}:${JSON.stringify(options)}`;
	const cached = dateTimeFormatters.get(key);
	if (cached) return cached;

	const formatter = new Intl.DateTimeFormat(locale, options);
	dateTimeFormatters.set(key, formatter);
	return formatter;
}
