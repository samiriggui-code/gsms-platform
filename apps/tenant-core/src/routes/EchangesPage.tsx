import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortalDataTable, type PortalColumn } from "@/components/PortalDataTable";
import { StatusPill } from "@/components/StatusPill";
import { api, type Echange } from "@/lib/api";

export function EchangesPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<Echange[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .echanges()
      .then((r) => setItems(r.items))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [t]);

  const columns = useMemo<PortalColumn<Echange>[]>(
    () => [
      {
        id: "subject",
        header: t("echanges.colSubject"),
        cell: (e) => (
          <div className="min-w-0 max-w-md">
            <p className="font-semibold text-foreground">{e.subject}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.preview}</p>
          </div>
        ),
      },
      {
        id: "date",
        header: t("echanges.colDate"),
        className: "whitespace-nowrap",
        cell: (e) => (
          <span className="text-muted-foreground">
            {new Date(e.updatedAt).toLocaleString(i18n.language)}
          </span>
        ),
      },
      {
        id: "prestation",
        header: t("echanges.colPrestation"),
        cell: (e) =>
          e.prestationId ? (
            <Link
              to="/prestations/$id"
              params={{ id: e.prestationId }}
              className="font-medium text-primary hover:underline"
            >
              {t("echanges.view")}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        header: t("echanges.colStatus"),
        cell: (e) => <StatusPill code={e.status} />,
      },
    ],
    [t, i18n.language],
  );

  if (error) return <p className="text-red-500">{error}</p>;
  if (!items) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="border-b border-border/70 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold">{t("echanges.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("echanges.subtitle")}</p>
      </div>
      <PortalDataTable
        columns={columns}
        rows={items}
        rowKey={(e) => e.id}
        empty={
          <>
            <MessageSquare className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">{t("echanges.empty")}</p>
          </>
        }
      />
    </section>
  );
}
