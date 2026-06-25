import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { ensureAuthenticated } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import { isAdminUser } from "@shared/lib/roles";
import { AdminShell } from "@widgets/admin-shell/admin-shell";
import { AppShell } from "@widgets/app-shell/app-shell";
import { AdminOverviewPage } from "@pages/admin/admin-overview-page";
import { AdminChannelsPage } from "@pages/admin/admin-channels-page";
import { AdminBillingPage } from "@pages/admin/admin-billing-page";
import { AdminLogsPage } from "@pages/admin/admin-logs-page";
import { AdminModelsPage } from "@pages/admin/admin-models-page";
import { AdminRedemptionsPage } from "@pages/admin/admin-redemptions-page";
import { AdminSettingsPage } from "@pages/admin/admin-settings-page";
import { AdminUsersPage } from "@pages/admin/admin-users-page";
import { ApiKeysPage } from "@pages/api-keys/api-keys-page";
import { ErrorPage } from "@pages/error/error-page";
import { LoginPage } from "@pages/login/login-page";
import { LogsPage } from "@pages/logs/logs-page";
import { ModelDetailPage } from "@pages/models/model-detail-page";
import { ModelsPage } from "@pages/models/models-page";
import { OverviewPage } from "@pages/overview/overview-page";
import { PlaygroundPage } from "@pages/playground/playground-page";
import { ProfilePage } from "@pages/profile/profile-page";
import { WalletPage } from "@pages/wallet/wallet-page";
import { NotFoundPage } from "@pages/not-found/not-found-page";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  notFoundComponent: NotFoundPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: async () => {
    const user = await ensureAuthenticated();

    if (!user) {
      throw redirect({ to: "/login" });
    }

    await usePlatformStore.getState().load();
  },
  component: AppShell,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin",
  beforeLoad: async () => {
    const user = await ensureAuthenticated();

    if (!user) {
      throw redirect({ to: "/login" });
    }

    if (!isAdminUser(user)) {
      throw redirect({ to: "/overview" });
    }

    await usePlatformStore.getState().load();
  },
  component: AdminShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/overview" });
  },
});

const overviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/overview",
  component: OverviewPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const modelsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/models",
  component: ModelsPage,
});

const modelDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/models/$modelId",
  component: ModelDetailPage,
});

const logsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/logs",
  component: LogsPage,
});

const playgroundRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/playground",
  component: PlaygroundPage,
});

const apiKeysRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/api-keys",
  component: ApiKeysPage,
});

const walletRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/wallet",
  component: WalletPage,
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/profile",
  component: ProfilePage,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin",
  component: AdminOverviewPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminChannelsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/channels",
  component: AdminChannelsPage,
});

const adminModelsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/models",
  component: AdminModelsPage,
});

const adminLogsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/logs",
  component: AdminLogsPage,
});

const adminRedemptionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/redemptions",
  component: AdminRedemptionsPage,
});

const adminBillingRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/billing",
  component: AdminBillingPage,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/admin/settings",
  component: AdminSettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute.addChildren([
    adminIndexRoute,
    adminUsersRoute,
    adminChannelsRoute,
    adminModelsRoute,
    adminLogsRoute,
    adminRedemptionsRoute,
    adminBillingRoute,
    adminSettingsRoute,
  ]),
  appRoute.addChildren([
    overviewRoute,
    modelsRoute,
    modelDetailRoute,
    logsRoute,
    playgroundRoute,
    apiKeysRoute,
    walletRoute,
    profileRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
