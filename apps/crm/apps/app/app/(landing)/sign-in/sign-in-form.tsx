"use client";

import { Alert, AlertTitle } from "@crm/ui/components/alert";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { signIn } from "next-auth/react";
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
			setError("Incorrect email or password.");
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

			<div className="flex flex-col gap-1.5">
				<label htmlFor="email" className="text-sm/5 font-medium">
					Email
				</label>
				<Input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="password" className="text-sm/5 font-medium">
					Password
				</label>
				<Input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
			</div>

			<Button type="submit" disabled={isSubmitting} className="w-full">
				{isSubmitting ? "Signing in…" : "Sign in"}
			</Button>
		</form>
	);
}
