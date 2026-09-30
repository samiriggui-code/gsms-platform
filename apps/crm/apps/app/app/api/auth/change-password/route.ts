import { db } from "@crm/db";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";
import authOptions from "@/app/api/auth/[...nextauth]/auth-options";
import { getPasswordSchema } from "@/app/(auth)/forms/password-schema";
import { getServerSession } from "next-auth";

const bodySchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: getPasswordSchema(),
});

export async function POST(request: Request) {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ message: "Not signed in." }, { status: 401 });
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));

	if (!parsed.success) {
		return NextResponse.json(
			{ message: parsed.error.issues[0]?.message ?? "Invalid input." },
			{ status: 400 },
		);
	}

	const { currentPassword, newPassword } = parsed.data;

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: { id: true, password: true },
	});

	if (!user?.password || !(await bcrypt.compare(currentPassword, user.password))) {
		return NextResponse.json(
			{ message: "Current password is incorrect." },
			{ status: 400 },
		);
	}

	const hashed = await bcrypt.hash(newPassword, 12);

	await db.user.update({
		where: { id: user.id },
		data: { password: hashed },
	});

	return NextResponse.json({ message: "Password changed." });
}
