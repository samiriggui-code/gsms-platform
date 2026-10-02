import type { Metadata } from "next";
import { AuthBrandedLayout } from "@/components/auth/auth-branded-layout";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/session";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;

  return (
    <AuthBrandedLayout>
      <LoginForm
        next={safeNextPath(rawNext)}
        notice={reason === "expired" ? "Votre session a expiré. Reconnectez-vous pour continuer." : undefined}
      />
    </AuthBrandedLayout>
  );
}
