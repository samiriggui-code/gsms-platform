"use client";

import { Alert, AlertTitle } from "@crm/ui/components/alert";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

		router.push("/");
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-5">
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>{error}</AlertTitle>
				</Alert>
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
				disabled={isSubmitting}
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
