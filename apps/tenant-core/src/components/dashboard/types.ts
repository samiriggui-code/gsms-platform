export type DashboardCounts = {
  prestationsOpen: number;
  piecesPending: number;
  devisPending: number;
  livrablesUnread: number;
};

export type DashboardPrestation = {
  id: string;
  title: string;
  kind: string;
  status: string;
  workspaceId: string;
};

export type DashboardData = {
  workspaceId: string;
  counts: DashboardCounts;
  prestations: DashboardPrestation[];
  source?: "crm" | "mock";
  warning?: string | null;
};
