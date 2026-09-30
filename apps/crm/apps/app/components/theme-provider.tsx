"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	// SSR keeps a real script (anti-FOUC). On the client, React 19 warns about
	// <script> in components — mark it as JSON so the warning goes away.
	const scriptProps =
		typeof window === "undefined"
			? undefined
			: ({ type: "application/json" } as const);

	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
			scriptProps={scriptProps}
			{...props}
		>
			{children}
		</NextThemesProvider>
	);
}
