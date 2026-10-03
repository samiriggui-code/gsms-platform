import {
	ensureWorkspaceMembership,
	GSMS_PROVIDER_ID,
	gsmsSignInDecision,
	gsmsSsoCredentials,
	gsmsWellKnownUrl,
	syncGsmsUser,
	workspaceRoleOf,
} from "@crm/auth";
import { hasSignInAllowList, isWorkspaceEmail } from "@crm/auth/workspace";
import { db } from "@crm/db";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { OAuthConfig } from "next-auth/providers/oauth";

type GsmsProfile = {
	sub: string;
	email?: string;
	name?: string;
	gsms_role?: string;
};

function gsmsProvider(): OAuthConfig<GsmsProfile> | undefined {
	const credentials = gsmsSsoCredentials();
	if (!credentials) return undefined;

	return {
		id: GSMS_PROVIDER_ID,
		name: "GSMS",
		type: "oauth",
		wellKnown: gsmsWellKnownUrl(credentials.issuer),
		clientId: credentials.clientId,
		clientSecret: credentials.clientSecret,
		authorization: { params: { scope: "openid profile email" } },
		idToken: true,
		checks: ["pkce", "state", "nonce"],
		profile(profile) {
			const email = profile.email?.trim().toLowerCase() ?? "";
			return {
				id: profile.sub,
				email,
				name: profile.name?.trim() || email,
				image: null,
			};
		},
	};
}

const gsms = gsmsProvider();

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
		...(gsms ? [gsms] : []),
	],

	pages: {
		signIn: "/sign-in",
		error: "/sign-in",
	},

	callbacks: {
		async signIn({ account, profile }) {
			if (account?.provider !== GSMS_PROVIDER_ID) return true;

			const decision = gsmsSignInDecision(profile);
			if (!decision.ok) {
				console.warn(
					`[auth] GSMS SSO refusé (${decision.reason}) pour sub=${String(profile?.sub ?? "?")}`,
				);
				return false;
			}

			const synced = await syncGsmsUser(decision.identity);
			if (!synced) {
				console.error(
					`[auth] GSMS SSO : impossible d'inscrire ${decision.identity.email} dans l'espace de travail`,
				);
				return false;
			}

			return true;
		},

		async jwt({ token, user, account }) {
			if (user && account?.provider === GSMS_PROVIDER_ID) {
				const local = await db.user.findUnique({
					where: { email: user.email.trim().toLowerCase() },
					select: { id: true, email: true, name: true, image: true },
				});

				if (!local) {
					throw new Error("GSMS SSO: user missing after sign-in sync.");
				}

				user.id = local.id;
				user.image = local.image;
				token.sub = local.id;
				token.email = local.email;
				token.name = local.name;
			}

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
