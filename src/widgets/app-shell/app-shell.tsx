import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Code2,
  CreditCard,
  Headphones,
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
    <div className="min-h-[100dvh] bg-[#fbf9f9] text-[#171717]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[296px] flex-col border-r border-[#d8d2d2] bg-[#fbf9f9] px-5 py-9 md:flex">
        <Link to="/overview">
          <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]">
            System
            <br />
            Console
          </h1>
          <p className="mt-3 text-sm font-medium text-[#5f5958]">Production workspace</p>
        </Link>

        <nav className="mt-14 grid gap-2">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/models" ? pathname.startsWith(item.to) : pathname === item.to;
            return (
              <Link
                className={cn(
                  "flex h-11 items-center gap-4 rounded-[2px] px-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#5f5958] hover:bg-[#efeded]",
                  active && "bg-black text-white hover:bg-black",
                )}
                key={item.to}
                to={item.to}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#d8d2d2] pt-9">
          <Link
            className="flex h-11 items-center gap-4 rounded-[2px] px-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#5f5958] hover:bg-[#efeded]"
            to="/models"
          >
            <BookOpen className="size-5" />
            Documentation
          </Link>
          <Link
            className="mt-2 flex h-11 items-center gap-4 rounded-[2px] px-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#5f5958] hover:bg-[#efeded]"
            to="/profile"
          >
            <Headphones className="size-5" />
            Support
          </Link>
          <Link
            className="mt-5 flex h-11 items-center justify-center rounded-[2px] bg-black px-4 text-sm font-bold uppercase tracking-[0.13em] text-white"
            to="/wallet"
          >
            Upgrade Plan
          </Link>
        </div>
      </aside>

      <div className="min-h-[100dvh] md:pl-[296px]">
        <header className="sticky top-0 z-20 border-b border-[#d8d2d2] bg-[#fbf9f9]/92 backdrop-blur">
          <div className="flex h-[74px] items-center justify-between gap-4 px-5 md:px-7">
            <Link className="flex items-center gap-3 md:hidden" to="/overview">
              <span className="grid size-9 place-items-center rounded-[2px] bg-black text-sm font-bold text-white">
                C
              </span>
              <span className="text-sm font-bold uppercase tracking-[0.13em]">Console</span>
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/models" ? pathname.startsWith(item.to) : pathname === item.to;
                return (
                  <Link
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-[2px] px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#5f5958] transition-colors",
                      active && "bg-black text-white",
                      !active && "hover:bg-[#efeded] hover:text-[#171717]",
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
            <div className="ml-auto hidden items-center gap-3 lg:flex">
              <span className="max-w-40 truncate text-sm font-medium text-[#5f5958]">
                {user?.display_name || user?.username}
              </span>
              {isAdminUser(user) && (
                <Link
                  className="inline-flex h-10 items-center gap-2 rounded-[2px] px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#242121] transition-colors hover:bg-[#efeded]"
                  to="/admin"
                >
                  <LayoutDashboard className="size-4" />
                  Admin
                </Link>
              )}
              <Button className="h-10 rounded-[2px] px-3" onClick={handleSignOut} variant="ghost">
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1640px] px-5 py-10 md:px-14 xl:px-[58px]">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-[#d8d2d2] bg-[#fbf9f9]/95 px-2 py-2 backdrop-blur md:hidden">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/models" ? pathname.startsWith(item.to) : pathname === item.to;
          return (
            <Link
              aria-label={item.label}
              className={cn(
                "grid place-items-center rounded-[2px] py-2 text-[#5f5958]",
                active && "bg-black text-white",
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
