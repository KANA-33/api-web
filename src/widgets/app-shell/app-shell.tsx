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

  return (
    <div className="min-h-screen text-[#2d2926]">
      <header className="sticky top-0 z-20 border-b border-[#d5c8b6]/80 bg-[#f5eee4]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" to="/overview">
            <span className="grid size-9 place-items-center rounded-md bg-[#2f3533] text-sm font-semibold text-[#f7efe3]">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold">Console</span>
              <span className="block text-xs text-[#7c6e5e]">Premium API workspace</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#655b50] transition-colors",
                    active && "bg-[#2f3533] text-[#f8f1e7]",
                    !active && "hover:bg-[#eadfce] hover:text-[#2d2926]",
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
            <span className="max-w-40 truncate text-sm text-[#6d6256]">
              {user?.display_name || user?.username}
            </span>
            {isAdminUser(user) && (
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#4b4640] transition-colors hover:bg-[#e8dece]"
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
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-[#d5c8b6] bg-[#f5eee4]/92 px-2 py-2 backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavigation.length}, minmax(0, 1fr))` }}
      >
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              aria-label={item.label}
              className={cn(
                "grid place-items-center rounded-md py-2 text-[#6d6256]",
                active && "bg-[#2f3533] text-[#f8f1e7]",
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
