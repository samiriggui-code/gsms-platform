"use client";

import { signOut } from "next-auth/react";
import { toast } from "sonner";

export async function signOutAndRedirect() {
	try {
		await signOut({ redirect: false });
	} catch {
		toast.error("Could not sign out.");
		return;
	}

	window.location.assign("/sign-in");
}
