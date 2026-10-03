import { isGsmsSsoConfigured } from "@crm/auth";
import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("shellSignIn");
	return { title: t("title") };
}

async function currentSession() {
	// Session cookies / NextAuth crypto must run at request time (Next 16 prerender).
	await connection();
	try {
		return await getSession();
	} catch (error) {
		unstable_rethrow(error);
		console.error("Sign-in: could not read the session.", error);
		return null;
	}
}

export default async function SignInPage() {
	const t = await getTranslations("shellSignIn");
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading title={t("title")} description={t("description")} />
				}
			>
				<SignIn />
			</Suspense>
		</AuthShell>
	);
}

async function SignIn() {
	const session = await currentSession();
	const t = await getTranslations("shellSignIn");

	if (session) {
		redirect("/");
	}

	return (
		<>
			<AuthHeading title={t("title")} description={t("description")} />

			<SignInForm gsmsEnabled={isGsmsSsoConfigured()} />
		</>
	);
}
