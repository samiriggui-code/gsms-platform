import "@crm/ui/globals.css";
import { Toaster } from "@crm/ui/components/sonner";
import { Spinner } from "@crm/ui/components/spinner";
import { TooltipProvider } from "@crm/ui/components/tooltip";
import { cn } from "@crm/ui/lib/utils";
import type { Metadata } from "next";
import { DM_Mono, Manrope, Newsreader } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, type ReactNode } from "react";
import { LocalDateTimeHydrator } from "@/components/local-date-time";
import { ThemeProvider } from "@/components/theme-provider";
import { defaultLocale } from "@/i18n/config";
import { TRPCReactProvider } from "@/lib/trpc/client";

const fontSans = Manrope({
	variable: "--font-manrope",
	subsets: ["latin"],
});

const fontMono = DM_Mono({
	variable: "--font-dm-mono",
	subsets: ["latin"],
	weight: ["400", "500"],
});

const fontSerif = Newsreader({
	variable: "--font-newsreader",
	subsets: ["latin"],
	style: ["normal", "italic"],
});

const fontClassName = cn(
	fontSans.variable,
	fontMono.variable,
	fontSerif.variable,
	"h-full antialiased",
);

export const metadata: Metadata = {
	title: {
		default: "GSMS CRM",
		template: "%s · GSMS CRM",
	},
	description: "CRM GSMS — pipeline, compliance et trust",
	icons: {
		icon: [
			{ url: "/favicon.svg", type: "image/svg+xml" },
			{ url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
		],
		apple: "/apple-touch-icon.png",
	},
	manifest: "/site.webmanifest",
};

/** Cookie locale + session — app is request-time, not a static prerender. */
export const instant = false;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang={defaultLocale}
			suppressHydrationWarning
			className={fontClassName}
		>
			<body className="flex min-h-full flex-col font-sans">
				<Suspense fallback={<BootFallback />}>
					<AppProviders>{children}</AppProviders>
				</Suspense>
			</body>
		</html>
	);
}

async function AppProviders({ children }: { children: ReactNode }) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<NuqsAdapter>
				<TRPCReactProvider>
					<ThemeProvider>
						<TooltipProvider>{children}</TooltipProvider>
						<Toaster richColors />
					</ThemeProvider>
				</TRPCReactProvider>
			</NuqsAdapter>
			<LocalDateTimeHydrator />
		</NextIntlClientProvider>
	);
}

function BootFallback() {
	return (
		<div className="grid flex-1 place-items-center py-24">
			<Spinner size="lg" />
		</div>
	);
}
