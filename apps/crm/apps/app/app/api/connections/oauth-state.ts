import { decode, encode, type JWT } from "next-auth/jwt";

const STATE_MAX_AGE = 10 * 60;

export type ConnectState = {
	nonce: string;
	userId: string;
	callbackURL: string;
	errorCallbackURL: string;
};

function secret(): string {
	const value = process.env.NEXTAUTH_SECRET;
	if (!value) throw new Error("NEXTAUTH_SECRET is not set.");
	return value;
}

/** Encodes the round-trip state directly into the OAuth `state` param — no server-side storage needed. */
export async function encodeConnectState(
	input: Omit<ConnectState, "nonce">,
): Promise<string> {
	// A connect-state token is a different payload shape from a real session
	// JWT (next-auth.d.ts's module augmentation describes the latter only).
	const token = { ...input, nonce: crypto.randomUUID() } as unknown as JWT;

	return encode({ secret: secret(), maxAge: STATE_MAX_AGE, token });
}

export async function decodeConnectState(
	state: string | null,
): Promise<ConnectState | null> {
	if (!state) return null;

	try {
		const payload = await decode({ token: state, secret: secret() });
		if (
			!payload ||
			typeof payload.userId !== "string" ||
			typeof payload.callbackURL !== "string" ||
			typeof payload.errorCallbackURL !== "string"
		) {
			return null;
		}

		return {
			nonce: typeof payload.nonce === "string" ? payload.nonce : "",
			userId: payload.userId,
			callbackURL: payload.callbackURL,
			errorCallbackURL: payload.errorCallbackURL,
		};
	} catch {
		return null;
	}
}
