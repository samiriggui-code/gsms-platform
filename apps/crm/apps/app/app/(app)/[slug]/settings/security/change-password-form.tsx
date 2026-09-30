"use client";

import { Alert, AlertTitle } from "@crm/ui/components/alert";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { useState } from "react";

export function ChangePasswordForm() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setDone(false);

		if (newPassword !== confirmPassword) {
			setError("The new password and confirmation don't match.");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/change-password", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ currentPassword, newPassword }),
			});

			const body = (await response.json().catch(() => null)) as {
				message?: string;
			} | null;

			if (!response.ok) {
				setError(body?.message ?? "Could not change the password.");
				return;
			}

			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setDone(true);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-5">
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>{error}</AlertTitle>
				</Alert>
			) : null}

			{done ? (
				<Alert>
					<AlertTitle>Password changed.</AlertTitle>
				</Alert>
			) : null}

			<div className="flex flex-col gap-1.5">
				<label htmlFor="currentPassword" className="text-sm/5 font-medium">
					Current password
				</label>
				<Input
					id="currentPassword"
					type="password"
					autoComplete="current-password"
					required
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="newPassword" className="text-sm/5 font-medium">
					New password
				</label>
				<Input
					id="newPassword"
					type="password"
					autoComplete="new-password"
					required
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="confirmPassword" className="text-sm/5 font-medium">
					Confirm new password
				</label>
				<Input
					id="confirmPassword"
					type="password"
					autoComplete="new-password"
					required
					value={confirmPassword}
					onChange={(event) => setConfirmPassword(event.target.value)}
				/>
			</div>

			<Button type="submit" disabled={isSubmitting} className="w-fit">
				{isSubmitting ? "Saving…" : "Change password"}
			</Button>
		</form>
	);
}
