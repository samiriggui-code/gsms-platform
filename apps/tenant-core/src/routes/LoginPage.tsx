import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandedLayout>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
        <div className="space-y-1.5 pb-1 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.035em]">
            {t("login.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="login-email">{t("login.email")}</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder={t("login.placeholderEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">{t("login.password")}</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute end-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={
                passwordVisible ? t("login.hidePassword") : t("login.showPassword")
              }
            >
              {passwordVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              {t("login.submitting")}
            </>
          ) : (
            t("login.submit")
          )}
        </Button>
      </form>
    </AuthBrandedLayout>
  );
}
