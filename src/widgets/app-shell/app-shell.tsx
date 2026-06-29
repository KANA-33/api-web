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
  { label: "Analytics", to: "/models", icon: ListTree },
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
    <div className="min-h-[100dvh] text-[#181614]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[288px] flex-col border-r border-[#ddd4ca]/80 bg-[#f8f4ee]/88 px-5 py-8 shadow-[18px_0_48px_rgb(87_69_50_/_0.06)] backdrop-blur-xl md:flex">
        <Link to="/overview">
          <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1f1a16]">
            System
            <br />
            Console
          </h1>
          <p className="mt-3 text-sm font-medium text-[#74695f]">Production workspace</p>
        </Link>

        <nav className="mt-12 grid gap-1.5">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/models" ? pathname.startsWith(item.to) : pathname === item.to;
            return (
              <Link
                className={cn(
                  "flex h-11 items-center gap-4 rounded-lg px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#6d6258] transition-all duration-200 hover:bg-[#eee8e1] hover:text-[#181614]",
                  active &&
                    "bg-[#211d19] !text-[#fffaf3] shadow-[0_10px_24px_rgb(59_45_34_/_0.16)] hover:bg-[#211d19] [&_svg]:!text-[#fffaf3]",
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

        <div className="mt-auto border-t border-[#ddd4ca]/80 pt-7">
          <Link
            className="flex h-11 items-center gap-4 rounded-lg px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#6d6258] transition-colors hover:bg-[#eee8e1] hover:text-[#181614]"
            to="/models"
          >
            <BookOpen className="size-5" />
            Documentation
          </Link>
          <Link
            className="mt-2 flex h-11 items-center gap-4 rounded-lg px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#6d6258] transition-colors hover:bg-[#eee8e1] hover:text-[#181614]"
            to="/profile"
          >
            <Headphones className="size-5" />
            Support
          </Link>
          <Link
            className="mt-5 flex h-11 items-center justify-center rounded-lg bg-[#211d19] px-4 text-sm font-bold uppercase tracking-[0.1em] text-[#fffaf3] shadow-[0_14px_30px_rgb(59_45_34_/_0.17)] transition-all hover:bg-[#332d27] active:translate-y-px"
            to="/wallet"
          >
            Upgrade Plan
          </Link>
        </div>
      </aside>

      <div className="min-h-[100dvh] md:pl-[288px]">
        <header className="sticky top-0 z-20 border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/78 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1520px] items-center justify-between gap-4 px-5 md:px-8">
            <Link className="flex items-center gap-3 md:hidden" to="/overview">
              <span className="grid size-9 place-items-center rounded-lg bg-[#211d19] text-sm font-bold text-[#fffaf3]">
                C
              </span>
              <span className="text-sm font-bold uppercase tracking-[0.1em]">Console</span>
            </Link>
            <div className="ml-auto hidden items-center gap-3 lg:flex">
              <span className="max-w-40 truncate text-sm font-medium text-[#74695f]">
                {user?.display_name || user?.username}
              </span>
              {isAdminUser(user) && (
                <Link
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#2b2621] transition-colors hover:bg-[#eee8e1]"
                  to="/admin"
                >
                  <LayoutDashboard className="size-4" />
                  Admin
                </Link>
              )}
              <Button className="h-10 px-3" onClick={handleSignOut} variant="ghost">
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] px-5 py-9 md:px-10 lg:py-12 xl:px-12">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 grid rounded-2xl border border-[#ddd4ca]/85 bg-[#fffaf4]/90 px-2 py-2 shadow-[0_18px_44px_rgb(74_58_42_/_0.16)] backdrop-blur-xl md:hidden">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/models" ? pathname.startsWith(item.to) : pathname === item.to;
          return (
            <Link
              aria-label={item.label}
              className={cn(
                "grid place-items-center rounded-xl py-2 text-[#6d6258] transition-colors",
                active && "bg-[#211d19] !text-[#fffaf3] [&_svg]:!text-[#fffaf3]",
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
