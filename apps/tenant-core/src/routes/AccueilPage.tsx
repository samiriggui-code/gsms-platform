import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AskWorkspacePanel,
  AttentionPanel,
  ContinueWorking,
  CoveragePanel,
  WorkspaceStatusCards,
  type DashboardData,
} from "@/components/dashboard";
import { api } from "@/lib/api";

export function AccueilPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .dashboard()
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [t]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) {
    return <p className="text-muted-foreground">{t("dashboard.loading")}</p>;
  }

  return (
    <div className="space-y-7">
      {data.warning ? (
        <p className="rounded-xl border border-amber-300/50 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
          {data.source === "crm" ? "CRM · " : ""}
          {data.warning}
        </p>
      ) : null}
      <WorkspaceStatusCards data={data} />

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]">
        <div className="space-y-7">
          <ContinueWorking prestations={data.prestations} />
          <CoveragePanel counts={data.counts} />
        </div>
        <div className="space-y-7">
          <AskWorkspacePanel />
          <AttentionPanel counts={data.counts} />
        </div>
      </div>
    </div>
  );
}
