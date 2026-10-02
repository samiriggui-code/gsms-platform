import { FileText, Search } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const { result } = q
    ? await loadForWorkspace<unknown>(ENDPOINTS.documents.search, { query: { q } })
    : await loadForWorkspace<unknown>(ENDPOINTS.documents.list);

  return (
    <>
      <PageHeader title="Documents" description="Bibliothèque du site, dossiers de mission, recherche et questions-réponses citées." />

      <form role="search" action="/app/documents" className="mb-5 flex gap-2">
        <label htmlFor="doc-search" className="sr-only">
          Rechercher dans les documents
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="doc-search" name="q" defaultValue={q} placeholder="Rechercher un document, une clause, une pièce…" className="pl-9" />
        </div>
        <Button type="submit" variant="contrast">
          Rechercher
        </Button>
      </form>

      <ResourcePanel
        title={q ? `Résultats pour « ${q} »` : "Bibliothèque"}
        description="Une seule copie de chaque fichier, versionnée et stockée par le Core."
        result={result}
        columns={[
          { key: "title", label: "Document", render: (row) => String(row.title ?? row.filename ?? row.name ?? "—") },
          { key: "classification", label: "Type" },
          { key: "mission", label: "Mission" },
          { key: "version", label: "Version" },
          { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
          { key: "updated_at", label: "Mis à jour" },
        ]}
        empty={{
          icon: FileText,
          title: q ? "Aucun résultat" : "Aucun document",
          description: q ? "Essayez d'autres mots-clés." : "Les documents déposés ou générés sur ce site apparaîtront ici.",
        }}
      />
    </>
  );
}
