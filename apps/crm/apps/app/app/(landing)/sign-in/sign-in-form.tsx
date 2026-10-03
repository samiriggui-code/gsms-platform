"use client";

import { Alert, AlertTitle } from "@crm/ui/components/alert";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Separator } from "@crm/ui/components/separator";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const SIGN_IN_ERROR_KEYS = {
	AccessDenied: "errorAccessDenied",
	OAuthSignin: "errorOAuthSignin",
	OAuthCallback: "errorOAuthCallback",
	OAuthAccountNotLinked: "errorOAuthAccountNotLinked",
	Callback: "errorCallback",
	Configuration: "errorConfiguration",
	SessionRequired: "errorSessionRequired",
	CredentialsSignin: "errorCredentials",
} as const;

type SignInErrorKey =
	| (typeof SIGN_IN_ERROR_KEYS)[keyof typeof SIGN_IN_ERROR_KEYS]
	| "errorDefault";

function signInErrorKey(code: string | null): SignInErrorKey | null {
	if (!code) return null;
	return code in SIGN_IN_ERROR_KEYS
		? SIGN_IN_ERROR_KEYS[code as keyof typeof SIGN_IN_ERROR_KEYS]
		: "errorDefault";
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
	const t = useTranslations("shellSignIn");
	const urlError = signInErrorKey(searchParams.get("error"));

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<SignInErrorKey | null>(urlError);
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
			setError("errorCredentials");
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
					<AlertTitle>{t(error)}</AlertTitle>
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
						{isRedirecting ? t("gsmsRedirecting") : t("gsmsSignIn")}
					</Button>

					<div className="flex items-center gap-3 text-[12.5px] text-muted-foreground">
						<Separator className="flex-1" />
						<span>{t("orPassword")}</span>
						<Separator className="flex-1" />
					</div>
				</>
			) : null}

			<div className="flex flex-col gap-2">
				<label htmlFor="email" className="text-sm font-medium">
					{t("email")}
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
					{t("password")}
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
				{isSubmitting ? t("submitting") : t("submit")}
			</Button>

			<p className="text-center text-[12.5px] text-muted-foreground">
				{t("notCustomer")}{" "}
				<Link
					href="https://gsms-security.com/contact"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					{t("contactUs")}
				</Link>
			</p>
		</form>
	);
}
