import { db } from "@crm/db";
import bcrypt from "bcrypt";
import { hasSignInAllowList, isWorkspaceEmail } from "../src/workspace";

const [email, name, password] = process.argv.slice(2);

if (!email || !name || !password) {
	console.error(
		[
			"",
			"  Usage: bun run create-user <email> <name> <password>",
			"",
			'  Example: bun run create-user samir@global-it-ss.com "Samir" \'a strong passphrase\'',
			"",
		].join("\n"),
	);
	process.exit(1);
}

if (password.length < 12) {
	console.error("  Password must be at least 12 characters.");
	process.exit(1);
}

if (!hasSignInAllowList()) {
	console.error(
		"  ALLOWED_SIGN_IN is not set — set it in .env first, or nobody (including this new account) can sign in.",
	);
	process.exit(1);
}

if (!isWorkspaceEmail(email)) {
	console.error(
		`  "${email}" is not on the ALLOWED_SIGN_IN list — add it there first.`,
	);
	process.exit(1);
}

async function main() {
	const hashed = await bcrypt.hash(password, 12);

	const user = await db.user.upsert({
		where: { email },
		create: {
			id: crypto.randomUUID(),
			email,
			name,
			password: hashed,
			emailVerified: true,
			updatedAt: new Date(),
		},
		update: {
			name,
			password: hashed,
			emailVerified: true,
		},
		select: { id: true, email: true },
	});

	console.log(`  Created/updated user ${user.email} (${user.id}).`);
	console.log(
		"  Workspace membership (owner for the first user) is assigned on first sign-in.",
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
