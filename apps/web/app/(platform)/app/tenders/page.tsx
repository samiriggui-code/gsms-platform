import { FileStack, Radar, Search } from "lucide-react";
import type { Metadata } from "next";
import { formatAmount, StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { tenderHref } from "@/lib/tenders/tabs";

export const metadata: Metadata = { title: "Appels d'offres" };

const FILTERS = [
  { name: "q", label: "Mots-clés", placeholder: "gardiennage, SSIAP, sûreté…", type: "search" },
  { name: "cpv", label: "Code CPV", placeholder: "79710000", type: "text" },
  { name: "nuts", label: "Zone NUTS", placeholder: "FR10", type: "text" },
  { name: "min_amount", label: "Montant min (€)", placeholder: "50000", type: "number" },
  { name: "max_amount", label: "Montant max (€)", placeholder: "", type: "number" },
  { name: "deadline_before", label: "Remise avant le", placeholder: "", type: "date" },
] as const;

type Params = Partial<Record<(typeof FILTERS)[number]["name"], string | string[]>>;

export default async function TendersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const query: Record<string, string> = {};
  for (const filter of FILTERS) {
    const raw = params[filter.name];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) query[filter.name] = value.slice(0, 200);
  }

  const { workspaceId: ws, failure } = await getWorkspaceContext();
  const [dossiers, opportunities] = ws
    ? await Promise.all([
        coreFetch<unknown>(ENDPOINTS.tenders.list(ws), { workspaceId: ws }),
        coreFetch<unknown>(ENDPOINTS.tenders.opportunities(ws), { workspaceId: ws, query, timeoutMs: 10000 }),
      ])
    : [failure, failure];

  return (
    <>
      <PageHeader
        title="Appels d'offres"
        description="Veille des opportunités et dossiers de réponse. Toutes les données passent par le Core, qui orchestre les moteurs d'analyse et de veille."
      />

      <div className="grid gap-5">
        <ResourcePanel
          title="Dossiers en cours"
          description="Missions de type appel d'offres sur ce site."
          result={dossiers}
          columns={[
            { key: "title", label: "Marché" },
            { key: "buyer", label: "Acheteur" },
            { key: "amount", label: "Montant estimé", render: (row) => formatAmount(row.amount) },
            { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
            { key: "submission_deadline", label: "Remise" },
          ]}
          rowHref={(row) => (row.id ? tenderHref(String(row.id)) : null)}
          empty={{ icon: FileStack, title: "Aucun dossier AO", description: "Qualifiez une opportunité ci-dessous ou créez une mission « appel d'offres » pour ouvrir un dossier." }}
        />

        <section aria-labelledby="veille-title" className="surface-card overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-border/70 px-5 py-4">
            <h2 id="veille-title" className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.015em]">
              <Radar className="size-4 text-primary" aria-hidden />
              Opportunités
            </h2>
            <p className="text-[13px] text-muted-foreground">Recherche dans la veille marchés publics (filtres CPV, NUTS, montant, date).</p>
          </div>
          <form role="search" action="/app/tenders" className="grid gap-3 border-b border-border/70 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {FILTERS.map((filter) => (
              <div key={filter.name} className="flex flex-col gap-1.5">
                <Label htmlFor={`f-${filter.name}`} className="text-[12px]">
                  {filter.label}
                </Label>
                <Input
                  id={`f-${filter.name}`}
                  name={filter.name}
                  type={filter.type}
                  defaultValue={query[filter.name] ?? ""}
                  placeholder={filter.placeholder}
                  min={filter.type === "number" ? 0 : undefined}
                />
              </div>
            ))}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" variant="contrast">
                <Search className="size-4" aria-hidden />
                Rechercher
              </Button>
            </div>
          </form>
          <ResourcePanel
            title="Résultats de veille"
            className="rounded-none border-0 shadow-none"
            result={opportunities}
            columns={[
              { key: "title", label: "Avis" },
              { key: "buyer", label: "Acheteur" },
              { key: "cpv", label: "CPV" },
              { key: "nuts", label: "Lieu" },
              { key: "amount", label: "Montant", render: (row) => formatAmount(row.amount) },
              { key: "deadline", label: "Date limite" },
            ]}
            empty={{ icon: Radar, title: "Aucune opportunité", description: "Aucun avis ne correspond à ces filtres." }}
          />
        </section>
      </div>
    </>
  );
}
