import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { ensureAuthenticated } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import { AppShell } from "@widgets/app-shell/app-shell";
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
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
