import type { Metadata } from "next";
import { ActivationForm } from "@/components/auth/activation-form";
import { AuthBrandedLayout } from "@/components/auth/auth-branded-layout";

export const metadata: Metadata = { title: "Choisir mon mot de passe", robots: { index: false } };

export default function ActivationPage() {
  return (
    <AuthBrandedLayout>
      <ActivationForm />
    </AuthBrandedLayout>
  );
}
