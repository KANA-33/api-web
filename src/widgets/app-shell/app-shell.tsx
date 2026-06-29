import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Code2,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  ListTree,
  PenLine,
  UserRound,
} from "lucide-react";
import { useAuthStore } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import { cn } from "@shared/lib/cn";
import { isAdminUser } from "@shared/lib/roles";
import { Button } from "@shared/ui/button";

const navigation = [
  { label: "Overview", to: "/overview", icon: BarChart3 },
  { label: "Models", to: "/models", icon: ListTree },
  { label: "Logs", to: "/logs", icon: PenLine },
  { label: "Playground", to: "/playground", icon: Code2 },
  { label: "API Keys", to: "/api-keys", icon: KeyRound },
  { label: "Wallet", to: "/wallet", icon: CreditCard },
  { label: "Profile", to: "/profile", icon: UserRound },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const platformStatus = usePlatformStore((state) => state.status);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }

  const visibleNavigation = navigation.filter((item) => {
    if (item.to === "/playground" && platformStatus?.self_use_mode_enabled === false) {
      return false;
    }

    return true;
  });

  if (pathname === "/logs") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen text-[#202326]">
      <header className="sticky top-0 z-20 border-b border-[#aeb6bf]/80 bg-[#eef1f3]/82 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" to="/overview">
            <span className="grid size-9 place-items-center rounded-md bg-[#24282d] text-sm font-semibold text-[#f4f6f7]">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold">Console</span>
              <span className="block text-xs text-[#626b73]">Premium API workspace</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#535b63] transition-colors",
                    active && "bg-[#24282d] text-[#f4f6f7]",
                    !active && "hover:bg-[#dce1e5] hover:text-[#202326]",
                  )}
                  key={item.to}
                  to={item.to}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="max-w-40 truncate text-sm text-[#535b63]">
              {user?.display_name || user?.username}
            </span>
            {isAdminUser(user) && (
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#343a40] transition-colors hover:bg-[#dce1e5]"
                to="/admin"
              >
                <LayoutDashboard className="size-4" />
                Admin
              </Link>
            )}
            <Button className="h-9 px-3" onClick={handleSignOut} variant="ghost">
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-[#aeb6bf] bg-[#eef1f3]/92 px-2 py-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.75)] backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavigation.length}, minmax(0, 1fr))` }}
      >
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              aria-label={item.label}
              className={cn(
                "grid place-items-center rounded-md py-2 text-[#535b63]",
                active && "bg-[#24282d] text-[#f4f6f7]",
              )}
              key={item.to}
              to={item.to}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
