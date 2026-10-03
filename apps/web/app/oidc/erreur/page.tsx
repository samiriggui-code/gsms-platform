import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthBrandedLayout } from "@/components/auth/auth-branded-layout";

export const metadata: Metadata = { title: "Connexion refusée", robots: { index: false } };

export default async function OidcErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.message) ? params.message[0] : params.message;
  const message = (raw ?? "La demande de connexion n’a pas pu être traitée.").slice(0, 300);
  return (
    <AuthBrandedLayout>
      <div className="flex flex-col gap-4">
        <ShieldAlert className="size-8 text-destructive" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Connexion refusée</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">
          Si le problème persiste, un administrateur peut vérifier l’application dans Paramètres → Applications
          connectées.
        </p>
        <Link href="/app" className="text-sm font-medium underline underline-offset-4">
          Revenir au portail
        </Link>
      </div>
    </AuthBrandedLayout>
  );
}
