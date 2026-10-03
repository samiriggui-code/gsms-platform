import { NextResponse } from "next/server";
import { coreFetch } from "@/lib/core/client";

/**
 * Activation d'un compte de l'équipe (lien d'invitation ou de réinitialisation). Anonyme : le jeton du lien
 * fait foi ; il arrive dans le corps de la requête (jamais dans une URL journalisée).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: unknown; password?: unknown; check?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }
  if (body.check === true) {
    const info = await coreFetch<unknown>("/auth/activation/check", { method: "POST", token: null, body: { token } });
    return info.ok
      ? NextResponse.json(info.data)
      : NextResponse.json({ error: info.message }, { status: info.status || 503 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  const result = await coreFetch<{ ok: boolean; email: string }>("/auth/activation", {
    method: "POST",
    token: null,
    body: { token, password },
  });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: result.message }, { status: result.status || 503 });
}
