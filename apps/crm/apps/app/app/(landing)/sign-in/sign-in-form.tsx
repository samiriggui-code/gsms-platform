"use client";

import { Alert, AlertTitle } from "@crm/ui/components/alert";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Separator } from "@crm/ui/components/separator";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const SIGN_IN_ERRORS: Record<string, string> = {
	AccessDenied:
		"Accès refusé : votre compte GSMS n'a pas accès au CRM. Contactez un administrateur GSMS.",
	OAuthSignin: "Impossible de joindre GSMS pour la connexion. Réessayez plus tard.",
	OAuthCallback:
		"La connexion GSMS a échoué ou a été refusée. Réessayez ou contactez un administrateur.",
	OAuthAccountNotLinked:
		"Ce compte est déjà associé à une autre méthode de connexion.",
	Callback: "La connexion GSMS n'a pas pu être finalisée. Réessayez.",
	Configuration:
		"La connexion GSMS est mal configurée sur ce CRM. Contactez un administrateur.",
	SessionRequired: "Connectez-vous pour accéder à cette page.",
	CredentialsSignin: "E-mail ou mot de passe incorrect.",
};

const DEFAULT_SIGN_IN_ERROR = "La connexion a échoué. Réessayez.";

function signInErrorMessage(code: string | null): string | null {
	if (!code) return null;
	return SIGN_IN_ERRORS[code] ?? DEFAULT_SIGN_IN_ERROR;
}

function safeCallbackUrl(value: string | null): string {
	if (!value) return "/";
	if (value.startsWith("/") && !value.startsWith("//")) return value;

	try {
		const url = new URL(value);
		if (url.origin === window.location.origin) {
			return `${url.pathname}${url.search}${url.hash}`;
		}
	} catch {
		return "/";
	}

	return "/";
}

export function SignInForm({ gsmsEnabled }: { gsmsEnabled: boolean }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const urlError = signInErrorMessage(searchParams.get("error"));

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(urlError);
	const [isRedirecting, setIsRedirecting] = useState(false);

	async function onGsmsSignIn() {
		setIsRedirecting(true);
		setError(null);
		await signIn("gsms", {
			callbackUrl: safeCallbackUrl(searchParams.get("callbackUrl")),
		});
	}

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);

		const response = await signIn("credentials", {
			redirect: false,
			email,
			password,
		});

		if (response?.error) {
			setError("E-mail ou mot de passe incorrect.");
			setIsSubmitting(false);
			return;
		}

		router.push(safeCallbackUrl(searchParams.get("callbackUrl")));
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-5">
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>{error}</AlertTitle>
				</Alert>
			) : null}

			{gsmsEnabled ? (
				<>
					<Button
						type="button"
						variant="outline"
						disabled={isRedirecting || isSubmitting}
						onClick={onGsmsSignIn}
						className="h-11 w-full"
					>
						{isRedirecting ? "Redirection vers GSMS…" : "Se connecter avec GSMS"}
					</Button>

					<div className="flex items-center gap-3 text-[12.5px] text-muted-foreground">
						<Separator className="flex-1" />
						<span>ou avec un mot de passe</span>
						<Separator className="flex-1" />
					</div>
				</>
			) : null}

			<div className="flex flex-col gap-2">
				<label htmlFor="email" className="text-sm font-medium">
					E-mail
				</label>
				<Input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="h-11 rounded-[12px] bg-muted/40"
				/>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="password" className="text-sm font-medium">
					Mot de passe
				</label>
				<Input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className="h-11 rounded-[12px] bg-muted/40"
				/>
			</div>

			<Button
				type="submit"
				disabled={isSubmitting || isRedirecting}
				className="h-11 w-full bg-[#111721] text-white hover:bg-[#111721]/90"
			>
				{isSubmitting ? "Connexion…" : "Se connecter"}
			</Button>

			<p className="text-center text-[12.5px] text-muted-foreground">
				Pas encore client ?{" "}
				<Link
					href="https://gsms-security.com/contact"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Contactez-nous
				</Link>
			</p>
		</form>
	);
}
