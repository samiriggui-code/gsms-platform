import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortalDataTable, type PortalColumn } from "@/components/PortalDataTable";
import { StatusPill } from "@/components/StatusPill";
import { api, type PortalDocument } from "@/lib/api";
import { useUploadStore } from "@/stores/uploadStore";

type Bucket = PortalDocument["bucket"];

export function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<PortalDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket | "TOUS">("TOUS");
  const openUpload = useUploadStore((s) => s.openUpload);
  const lastUploadAt = useUploadStore((s) => s.lastUploadAt);

  const buckets = useMemo(
    () =>
      [
        { id: "TOUS" as const, label: t("documents.all") },
        { id: "A_FOURNIR" as const, label: t("documents.toProvide") },
        { id: "FOURNI" as const, label: t("documents.provided") },
        { id: "LIVRABLE" as const, label: t("documents.deliverables") },
      ] satisfies { id: Bucket | "TOUS"; label: string }[],
    [t],
  );

  const reload = useCallback(() => {
    void api
      .documents()
      .then((r) => setItems(r.items))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.error")),
      );
  }, [t]);

  useEffect(() => {
    reload();
  }, [reload, lastUploadAt]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (bucket === "TOUS") return items;
    return items.filter((d) => d.bucket === bucket);
  }, [items, bucket]);

  const columns = useMemo<PortalColumn<PortalDocument>[]>(
    () => [
      {
        id: "title",
        header: t("documents.colDocument"),
        cell: (d) => <span className="font-semibold text-foreground">{d.title}</span>,
      },
      {
        id: "date",
        header: t("documents.colUpdated"),
        className: "whitespace-nowrap",
        cell: (d) => (
          <span className="text-muted-foreground">
            {new Date(d.updatedAt).toLocaleDateString(i18n.language)}
          </span>
        ),
      },
      {
        id: "prestation",
        header: t("documents.colPrestation"),
        cell: (d) =>
          d.prestationId ? (
            <Link
              to="/prestations/$id"
              params={{ id: d.prestationId }}
              className="font-medium text-primary hover:underline"
            >
              {d.prestationId}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        header: t("documents.colStatus"),
        cell: (d) => <StatusPill code={d.bucket} />,
      },
      {
        id: "actions",
        header: t("documents.colAction"),
        className: "text-right",
        cell: (d) =>
          d.bucket === "A_FOURNIR" ? (
            <button
              type="button"
              onClick={() =>
                openUpload({
                  prestationId: d.prestationId,
                  demandeId: d.id,
                  demandeTitle: d.title,
                })
              }
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
            >
              {t("documents.respond")}
            </button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [openUpload, t, i18n.language],
  );

  if (error) return <p className="text-red-500">{error}</p>;
  if (!items) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-surface-subtle p-1">
          {buckets.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className={
                bucket === b.id
                  ? "rounded-lg bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
                  : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {b.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openUpload()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
        >
          <Upload className="h-3.5 w-3.5" />
          {t("documents.deposit")}
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <PortalDataTable
          columns={columns}
          rows={filtered}
          rowKey={(d) => d.id}
          empty={
            <>
              <FileText className="mx-auto h-7 w-7 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">{t("documents.emptyTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("documents.emptyHint")}
              </p>
            </>
          }
        />
      </section>
    </div>
  );
}
