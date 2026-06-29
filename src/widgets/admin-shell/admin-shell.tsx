import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  CreditCard,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useAuthStore } from "@features/auth/store";
import { cn } from "@shared/lib/cn";
import { isRootUser } from "@shared/lib/roles";
import { Button } from "@shared/ui/button";

const adminNavigation = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: UsersRound },
  { label: "Channels", to: "/admin/channels", icon: Activity },
  { label: "Models", to: "/admin/models", icon: Boxes },
  { label: "Logs", to: "/admin/logs", icon: Home },
  { label: "Redemptions", to: "/admin/redemptions", icon: KeyRound },
  { label: "Billing", to: "/admin/billing", icon: CreditCard },
  { label: "Settings", to: "/admin/settings", icon: Settings2 },
];

export function AdminShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-[100dvh] bg-[#fbf9f9] text-[#171717]">
      <div className="grid min-h-[100dvh] lg:grid-cols-[296px_1fr]">
        <aside className="hidden border-r border-[#d8d2d2] bg-[#fbf9f9] px-5 py-9 lg:block">
          <Link to="/admin">
            <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]">
              Admin
              <br />
              Console
            </h1>
            <p className="mt-3 text-sm font-medium text-[#5f5958]">Platform operations</p>
          </Link>

          <nav className="mt-14 grid gap-2">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);

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
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[#d8d2d2] bg-[#fbf9f9]/92 backdrop-blur">
            <div className="flex h-[74px] items-center justify-between gap-4 px-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5f5958]">
                  Administrative workspace
                </p>
                <p className="mt-1 text-sm font-medium text-[#5f5958]">
                  {user?.display_name || user?.username} · {isRootUser(user) ? "Root" : "Admin"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-[2px] px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#242121] transition-colors hover:bg-[#efeded]"
                  to="/overview"
                >
                  User console
                </Link>
                <Button className="gap-2 rounded-[2px]" onClick={handleSignOut} variant="secondary">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-[#d8d2d2] px-4 py-2 lg:hidden">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);

                return (
                  <Link
                    aria-label={item.label}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-[2px] px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#5f5958]",
                      active && "bg-black text-white",
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
          </header>

          <main className="mx-auto max-w-[1640px] px-5 py-10 md:px-14 xl:px-[58px]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
