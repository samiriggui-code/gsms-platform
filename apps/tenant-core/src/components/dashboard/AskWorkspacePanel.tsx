import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquareText, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Carte « Ask your workspace » — pattern IntakePage DocuLens. */
export function AskWorkspacePanel() {
  const { t } = useTranslation();
  const prompts = [
    t("dashboard.prompt1"),
    t("dashboard.prompt2"),
    t("dashboard.prompt3"),
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.045)]">
      <div className="p-5 sm:p-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm">
          <MessageSquareText className="h-4 w-4" />
        </span>
        <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
          {t("dashboard.askTitle")}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {t("dashboard.askDesc")}
        </p>
        <Link
          to="/echanges"
          className="mt-5 flex items-center gap-3 rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-sm transition hover:border-[hsl(var(--primary)/0.35)]"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1">{t("dashboard.askPlaceholder")}</span>
          <ArrowRight className="h-4 w-4 text-[hsl(var(--primary))]" />
        </Link>
      </div>
      <div className="border-t border-[hsl(var(--primary)/0.15)] px-5 py-4 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {t("dashboard.tryAsking")}
        </p>
        <div className="mt-3 space-y-2">
          {prompts.map((prompt) => (
            <Link
              key={prompt}
              to="/echanges"
              className="group flex items-center justify-between gap-3 text-xs font-medium text-[hsl(var(--foreground))]"
            >
              <span>{prompt}</span>
              <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))]" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
