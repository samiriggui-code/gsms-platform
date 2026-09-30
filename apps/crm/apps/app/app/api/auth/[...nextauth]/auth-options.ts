import { ensureWorkspaceMembership, workspaceRoleOf } from "@crm/auth";
import { hasSignInAllowList, isWorkspaceEmail } from "@crm/auth/workspace";
import { db } from "@crm/db";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
	session: {
		strategy: "jwt",
		maxAge: 60 * 60 * 24 * 7,
	},

	secret: process.env.NEXTAUTH_SECRET,

	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const email = credentials?.email?.trim().toLowerCase();
				const password = credentials?.password;

				if (!email || !password) {
					throw new Error("Enter both email and password.");
				}

				if (!hasSignInAllowList() || !isWorkspaceEmail(email)) {
					throw new Error("This CRM is private. That address is not on the allow-list.");
				}

				const user = await db.user.findUnique({ where: { email } });

				if (!user?.password) {
					throw new Error("Incorrect email or password.");
				}

				const valid = await bcrypt.compare(password, user.password);
				if (!valid) {
					throw new Error("Incorrect email or password.");
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
				};
			},
		}),
	],

	pages: {
		signIn: "/sign-in",
	},

	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.image = user.image ?? null;

				const workspaceId = await ensureWorkspaceMembership(user.id);
				token.workspaceId = workspaceId ?? null;
				token.role = workspaceId
					? await workspaceRoleOf(user.id)
					: null;
			}

			return token;
		},

		async session({ session, token }) {
			session.user.id = token.id;
			session.user.image = token.image;
			session.user.workspaceId = token.workspaceId;
			session.user.role = token.role;

			return session;
		},
	},
};

export default authOptions;
