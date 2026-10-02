import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
	title: "Connexion",
};

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

export default function SignInPage() {
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading
						title="Connexion"
						description="Accédez à votre espace GSMS CRM."
					/>
				}
			>
				<SignIn />
			</Suspense>
		</AuthShell>
	);
}

async function SignIn() {
	const session = await currentSession();

	if (session) {
		redirect("/");
	}

	return (
		<>
			<AuthHeading
				title="Connexion"
				description="Accédez à votre espace GSMS CRM."
			/>

			<SignInForm />
		</>
	);
}
