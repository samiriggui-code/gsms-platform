import {
  Building2,
  ChevronRight,
  Download,
  ExternalLink,
  FileLock2,
  Folder,
  FolderLock,
  FolderOpen,
  History,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CoreFailureState, EmptyState } from "@/components/platform/core-state";
import { formatDate } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { VaultNewFolder, VaultUpload, VaultVerify } from "@/components/platform/vault/vault-actions";
import { Badge } from "@/components/ui/badge";
import { coreFetch, getCurrentWorkspaceId } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Coffre-fort" };

type TreeWorkspace = { id: string; name: string; kind: string; status: string; role: string; documents: number };
type TreeSite = { id: string | null; name: string; workspaces: TreeWorkspace[] };
type TreeClient = { id: string; name: string; sites: TreeSite[] };
type FolderNode = {
  id: string;
  parent_id: string | null;
  name: string;
  system_key: string | null;
  client_visible: boolean;
  writable: boolean;
  documents: number;
  children: FolderNode[];
};
type VaultDocument = {
  id: string;
  title: string;
  doc_type: string | null;
  version: number | null;
  filename: string | null;
  size: number | null;
  mime: string | null;
  sha256: string | null;
  encrypted: boolean;
  uploaded_by: string | null;
  uploaded_at: string | null;
  parse_status: "PENDING" | "RUNNING" | "PARSED" | "FAILED" | null;
};
type FolderContent = { folder: FolderNode; path: { id: string; name: string }[]; folders: FolderNode[]; documents: VaultDocument[] };
type Version = { id: string; n: number; filename: string; sha256: string; size: number; uploaded_by: string; uploaded_at: string };
type Access = { at: string; actor: string; actor_name: string; action: string; detail: Record<string, unknown> | null; hash: string };

const CLIENT_ROLES = new Set(["client_admin", "client_member"]);
const ACTIONS: Record<string, string> = {
  "document.upload": "Dépôt",
  "document.download": "Ouverture / téléchargement",
  "vault.document.move": "Déplacement",
  "vault.document.verify": "Vérification d'intégrité",
};
const PARSE: Record<string, { label: string; tone: "neutral" | "primary" | "success" | "danger" }> = {
  PENDING: { label: "En attente", tone: "neutral" },
  RUNNING: { label: "Analyse…", tone: "primary" },
  PARSED: { label: "Analysé", tone: "success" },
  FAILED: { label: "Échec analyse", tone: "danger" },
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function bytes(size: number | null) {
  if (size === null) return "—";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} Ko`;
  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}

function href(ws: string, folder?: string, doc?: string) {
  const q = new URLSearchParams({ ws });
  if (folder) q.set("folder", folder);
  if (doc) q.set("doc", doc);
  return `/app/coffre-fort?${q.toString()}`;
}

function FolderTree({ nodes, ws, current, depth = 0 }: { nodes: FolderNode[]; ws: string; current: string; depth?: number }) {
  return (
    <ul className={cn("flex flex-col", depth > 0 && "ml-3 border-l border-border pl-2")}>
      {nodes.map((node) => {
        const active = node.id === current;
        const Icon = !node.client_visible ? FolderLock : active ? FolderOpen : Folder;
        return (
          <li key={node.id}>
            <Link
              href={href(ws, node.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                active ? "bg-primary/[0.08] font-semibold text-primary" : "text-foreground/85 hover:bg-muted",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{node.name}</span>
              {node.documents ? <span className="font-mono text-[10.5px] text-muted-foreground">{node.documents}</span> : null}
            </Link>
            {node.children.length ? <FolderTree nodes={node.children} ws={ws} current={current} depth={depth + 1} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string | string[]; folder?: string | string[]; doc?: string | string[] }>;
}) {
  const params = await searchParams;
  const tree = await coreFetch<TreeClient[]>(ENDPOINTS.vault.tree());
  const header = (
    <PageHeader
      eyebrow="Stockage chiffré"
      title="Coffre-fort"
      description="Toutes les pièces de vos prestations, chiffrées une par une avec la clé de leur prestation, classées par client, site et dossier. Chaque ouverture est tracée."
    />
  );
  if (!tree.ok) {
    return (
      <>
        {header}
        <div className="rounded-[16px] border border-border bg-card">
          <CoreFailureState failure={tree} />
        </div>
      </>
    );
  }

  const workspaces = tree.data.flatMap((c) => c.sites.flatMap((s) => s.workspaces));
  const requested = one(params.ws);
  const fallback = await getCurrentWorkspaceId();
  const current =
    workspaces.find((w) => w.id === requested) ?? workspaces.find((w) => w.id === fallback) ?? workspaces[0];
  if (!current) {
    return (
      <>
        {header}
        <div className="rounded-[16px] border border-border bg-card">
          <EmptyState icon={FolderLock} title="Aucune prestation" description="Le coffre-fort d'une prestation s'ouvre quand son espace de travail est créé." />
        </div>
      </>
    );
  }
  const isClient = CLIENT_ROLES.has(current.role);

  const folders = await coreFetch<FolderNode[]>(ENDPOINTS.vault.folders(current.id), { workspaceId: current.id });
  const roots = folders.ok ? folders.data : [];
  const folderId = one(params.folder) ?? roots[0]?.id;
  const content = folderId
    ? await coreFetch<FolderContent>(ENDPOINTS.vault.folder(current.id, folderId), { workspaceId: current.id })
    : null;
  const docId = one(params.doc);
  const selected = content?.ok ? content.data.documents.find((d) => d.id === docId) : undefined;
  const [versions, access] = selected
    ? await Promise.all([
        coreFetch<Version[]>(ENDPOINTS.vault.versions(current.id, selected.id), { workspaceId: current.id }),
        isClient
          ? Promise.resolve(null)
          : coreFetch<Access[]>(ENDPOINTS.vault.accessLog(current.id, selected.id), { workspaceId: current.id }),
      ])
    : [null, null];

  return (
    <>
      {header}
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Client → Site → Prestation, puis dossiers de la prestation ouverte */}
        <nav aria-label="Arborescence du coffre-fort" className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-3">
          <ul className="flex flex-col gap-3">
            {tree.data.map((client) => (
              <li key={client.id}>
                <p className="flex items-center gap-2 px-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <Building2 className="size-3.5" aria-hidden /> {client.name}
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {client.sites.map((site) => (
                    <li key={site.id ?? "none"}>
                      <p className="flex items-center gap-2 px-2 pt-1 text-[12.5px] font-medium text-foreground/80">
                        <MapPin className="size-3.5 text-muted-foreground" aria-hidden /> {site.name}
                      </p>
                      <ul className="ml-3 border-l border-border pl-2">
                        {site.workspaces.map((w) => (
                          <li key={w.id}>
                            <Link
                              href={href(w.id)}
                              aria-current={w.id === current.id ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px]",
                                w.id === current.id ? "bg-foreground text-background" : "hover:bg-muted",
                              )}
                            >
                              <Lock className="size-3.5 shrink-0" aria-hidden />
                              <span className="min-w-0 flex-1 truncate">{w.name}</span>
                              <span className="font-mono text-[10.5px] opacity-70">{w.documents}</span>
                            </Link>
                            {w.id === current.id && roots.length ? (
                              <div className="mt-1 mb-2">
                                <FolderTree nodes={roots} ws={current.id} current={folderId ?? ""} />
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <section className="flex min-w-0 flex-col gap-4">
          {!folders.ok ? (
            <div className="rounded-[16px] border border-border bg-card">
              <CoreFailureState failure={folders} />
            </div>
          ) : !content ? null : !content.ok ? (
            <div className="rounded-[16px] border border-border bg-card">
              <CoreFailureState failure={content} />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[13px]">
                    <li className="text-muted-foreground">{current.name}</li>
                    {content.data.path.map((crumb) => (
                      <li key={crumb.id} className="flex items-center gap-1">
                        <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
                        <Link href={href(current.id, crumb.id)} className="font-medium hover:underline">
                          {crumb.name}
                        </Link>
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-center gap-2">
                    {!content.data.folder.client_visible ? (
                      <Badge tone="warning">
                        <FolderLock className="size-3" aria-hidden /> Interne GSMS
                      </Badge>
                    ) : null}
                    {content.data.folder.writable ? <VaultNewFolder workspaceId={current.id} parentId={content.data.folder.id} /> : null}
                  </div>
                </div>
                {content.data.folder.writable ? <VaultUpload workspaceId={current.id} folderId={content.data.folder.id} /> : null}
              </div>

              <div className="overflow-hidden rounded-[16px] border border-border bg-card">
                {content.data.folders.length === 0 && content.data.documents.length === 0 ? (
                  <EmptyState icon={FolderOpen} title="Dossier vide" description="Déposez des pièces ou créez un sous-dossier." />
                ) : (
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-border bg-surface-subtle text-[11.5px] uppercase tracking-[0.05em] text-muted-foreground">
                      <tr>
                        <th className="w-1/2 px-4 py-2.5 font-medium">Nom</th>
                        <th className="hidden px-4 py-2.5 font-medium md:table-cell">Type</th>
                        <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Taille</th>
                        <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Déposé</th>
                        <th className="px-4 py-2.5 font-medium">État</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {content.data.folders.map((f) => (
                        <tr key={f.id} className="hover:bg-muted/50">
                          <td className="px-4 py-2.5" colSpan={5}>
                            <Link href={href(current.id, f.id)} className="flex items-center gap-2 font-medium">
                              {f.client_visible ? <Folder className="size-4 text-primary" aria-hidden /> : <FolderLock className="size-4 text-warning" aria-hidden />}
                              {f.name}
                              <span className="font-mono text-[11px] text-muted-foreground">{f.documents} pièce(s)</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {content.data.documents.map((d) => {
                        const parse = d.parse_status ? PARSE[d.parse_status] : null;
                        return (
                          <tr key={d.id} className={cn("hover:bg-muted/50", d.id === selected?.id && "bg-primary/[0.05]")}>
                            <td className="max-w-0 px-4 py-2.5">
                              <Link href={href(current.id, content.data.folder.id, d.id)} className="flex min-w-0 items-center gap-2">
                                <FileLock2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="truncate font-medium">{d.filename ?? d.title}</span>
                                {d.version && d.version > 1 ? <span className="font-mono text-[11px] text-muted-foreground">v{d.version}</span> : null}
                              </Link>
                            </td>
                            <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">{d.doc_type ?? "—"}</td>
                            <td className="hidden px-4 py-2.5 font-mono text-[12px] text-muted-foreground sm:table-cell">{bytes(d.size)}</td>
                            <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">{d.uploaded_at ? formatDate(d.uploaded_at) : "—"}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {d.encrypted ? (
                                  <Badge tone="success">
                                    <Lock className="size-3" aria-hidden /> Chiffré
                                  </Badge>
                                ) : (
                                  <Badge tone="warning">Non chiffré</Badge>
                                )}
                                {parse ? <Badge tone={parse.tone}>{parse.label}</Badge> : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {selected ? (
                <div className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{selected.filename ?? selected.title}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">SHA-256 {selected.sha256}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/vault/${current.id}/documents/${selected.id}/content`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-[13px] font-semibold hover:bg-muted"
                      >
                        <ExternalLink className="size-4" aria-hidden /> Ouvrir
                      </a>
                      <a
                        href={`/api/vault/${current.id}/documents/${selected.id}/content?download=1`}
                        className="inline-flex h-8 items-center gap-2 rounded-lg bg-foreground px-3 text-[13px] font-semibold text-background"
                      >
                        <Download className="size-4" aria-hidden /> Télécharger
                      </a>
                    </div>
                  </div>
                  {!isClient ? <VaultVerify workspaceId={current.id} documentId={selected.id} /> : null}

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        <History className="size-3.5" aria-hidden /> Versions
                      </p>
                      {versions?.ok ? (
                        <ul className="divide-y divide-border rounded-[12px] border border-border text-[12.5px]">
                          {[...versions.data].reverse().map((v) => (
                            <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                              <span className="font-mono text-[11px] text-muted-foreground">v{v.n}</span>
                              <span className="min-w-0 flex-1 truncate">{v.filename}</span>
                              <span className="hidden text-muted-foreground sm:inline">{formatDate(v.uploaded_at)}</span>
                              <a href={`/api/vault/${current.id}/documents/${selected.id}/content?download=1&version_id=${v.id}`} aria-label={`Télécharger la version ${v.n}`} className="text-muted-foreground hover:text-foreground">
                                <Download className="size-3.5" aria-hidden />
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    {access ? (
                      <div>
                        <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          <ShieldCheck className="size-3.5" aria-hidden /> Journal des accès
                        </p>
                        {access.ok ? (
                          <ul className="max-h-64 divide-y divide-border overflow-auto rounded-[12px] border border-border text-[12.5px]">
                            {access.data.map((a) => (
                              <li key={a.hash} className="flex flex-col gap-0.5 px-3 py-2">
                                <span className="font-medium">{ACTIONS[a.action] ?? a.action}</span>
                                <span className="text-muted-foreground">
                                  {formatDate(a.at)} · {a.actor_name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <CoreFailureState failure={access} compact />
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  );
}
