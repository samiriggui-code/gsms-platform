import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban, FileText, Receipt, ScanText } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent } from "@/components/ui/card";

function BrandMark() {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-foreground text-background shadow-sm">
        <ScanText className="h-[17px] w-[17px]" strokeWidth={2.2} />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.025em]">
        {t("app.name")}{" "}
        <span className="text-muted-foreground">{t("app.client")}</span>
      </span>
    </div>
  );
}

function AuthControls() {
  return (
    <div className="flex items-center gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}

const PANEL_ITEMS = [
  { icon: FolderKanban, key: "login.panelItemPrestations" },
  { icon: FileText, key: "login.panelItemDocuments" },
  { icon: Receipt, key: "login.panelItemFinance" },
] as const;

export function AuthBrandedLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-screen w-full grow bg-background lg:grid-cols-2">
      <div className="order-2 flex flex-col lg:order-1">
        <div className="flex h-14 items-center justify-between border-b border-border/70 px-4 sm:px-6 lg:hidden">
          <BrandMark />
          <AuthControls />
        </div>

        <div className="relative flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-10">
          <div className="absolute end-6 top-6 hidden lg:block">
            <AuthControls />
          </div>
          <Card className="w-full max-w-[400px]">
            <CardContent className="p-6">{children}</CardContent>
          </Card>
        </div>
      </div>

      <div className="order-1 flex flex-col overflow-hidden bg-[#111721] text-white lg:order-2 lg:m-5 lg:rounded-[28px] lg:border lg:border-white/10">
        <div className="flex flex-col gap-5 p-8 lg:px-12 lg:pb-6 lg:pt-12">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-[#111721] shadow-sm">
                <ScanText className="h-[17px] w-[17px]" strokeWidth={2.2} />
              </span>
              <span className="text-[15px] font-semibold tracking-[-0.025em]">
                {t("app.name")}{" "}
                <span className="text-white/55">{t("app.client")}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              {t("login.panelEyebrow")}
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-white md:text-[28px]">
              {t("login.panelTitle")}
            </h2>
            <p className="max-w-md text-sm leading-6 text-white/60">
              {t("login.panelBody")}
            </p>
          </div>
        </div>

        <div className="relative mt-auto flex flex-1 flex-col justify-end gap-3 px-8 pb-8 lg:px-12 lg:pb-12">
          {PANEL_ITEMS.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-white/85">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
