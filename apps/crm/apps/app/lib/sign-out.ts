"use client";

import { signOut } from "next-auth/react";

export async function signOutAndRedirect() {
	await signOut({ redirect: false });

	window.location.assign("/sign-in");
}
