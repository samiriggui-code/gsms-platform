import { needsMailboxGrant } from "@crm/auth";
import { db } from "@crm/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import authOptions from "@/app/api/auth/[...nextauth]/auth-options";

export type Session = {
	user: {
		id: string;
		email: string;
		name: string;
		image: string | null;
		workspaceId: string | null;
		role: string | null;
	};
};

export const getSession = cache(
	async (): Promise<Session | null> =>
		(await getServerSession(authOptions)) as Session | null,
);

export async function requireSession(): Promise<Session> {
	const session = await getSession();

	if (!session) {
		redirect("/sign-in");
	}

	return session;
}

export const signInAccounts = cache(async (userId: string) =>
	db.account.findMany({
		where: { userId },
		select: { providerId: true, scope: true },
	}),
);

export async function requireMailboxAccess(): Promise<Session> {
	const session = await requireSession();

	if (needsMailboxGrant(await signInAccounts(session.user.id))) {
		redirect("/grant-access");
	}

	return session;
}
