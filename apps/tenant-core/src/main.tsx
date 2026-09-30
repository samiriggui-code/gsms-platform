import { useEffect, useState } from "react";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shell } from "@/components/Shell";
import { ParametresLayout } from "@/components/parametres/ParametresLayout";
import { api, type MeResponse } from "@/lib/api";
import { AccueilPage } from "@/routes/AccueilPage";
import { DocumentsPage } from "@/routes/DocumentsPage";
import { EchangesPage } from "@/routes/EchangesPage";
import { FinanceDetailPage } from "@/routes/FinanceDetailPage";
import { FinancePage } from "@/routes/FinancePage";
import { LoginPage } from "@/routes/LoginPage";
import {
  ParametresEquipePage,
  ParametresNotificationsPage,
  ParametresSitesPage,
} from "@/routes/ParametresPages";
import { PrestationDetailPage } from "@/routes/PrestationDetailPage";
import { PrestationsPage } from "@/routes/PrestationsPage";
import { ProfilPage } from "@/routes/ProfilPage";
import "./index.css";

function AuthedLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);

  async function refresh() {
    const data = await api.me();
    setMe(data);
  }

  useEffect(() => {
    void refresh().catch(() => {
      void navigate({ to: "/login" });
    });
  }, [navigate]);

  if (!me) {
    return <div className="p-8 text-[var(--muted)]">{t("common.loading")}</div>;
  }

  return <Shell me={me} onWorkspaceChange={refresh} />;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AuthedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: AccueilPage,
});

const prestationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/prestations",
  component: PrestationsPage,
});

const prestationDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/prestations/$id",
  component: PrestationDetailPage,
});

const documentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/documents",
  component: DocumentsPage,
});

const echangesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/echanges",
  component: EchangesPage,
});

const financeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/finance",
  component: FinancePage,
});

const financeDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/finance/$id",
  component: FinanceDetailPage,
});

const profilRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/profil",
  component: ProfilPage,
});

const parametresRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/parametres",
  component: ParametresLayout,
});

const parametresIndexRoute = createRoute({
  getParentRoute: () => parametresRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/parametres/sites" });
  },
});

const parametresSitesRoute = createRoute({
  getParentRoute: () => parametresRoute,
  path: "/sites",
  component: ParametresSitesPage,
});

const parametresEquipeRoute = createRoute({
  getParentRoute: () => parametresRoute,
  path: "/equipe",
  component: ParametresEquipePage,
});

const parametresNotifsRoute = createRoute({
  getParentRoute: () => parametresRoute,
  path: "/notifications",
  component: ParametresNotificationsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute,
    prestationsRoute,
    prestationDetailRoute,
    documentsRoute,
    echangesRoute,
    financeRoute,
    financeDetailRoute,
    profilRoute,
    parametresRoute.addChildren([
      parametresIndexRoute,
      parametresSitesRoute,
      parametresEquipeRoute,
      parametresNotifsRoute,
    ]),
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return <RouterProvider router={router} />;
}
