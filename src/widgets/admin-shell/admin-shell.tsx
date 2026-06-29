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
    <div className="min-h-screen text-[#202326]">
      <div className="grid min-h-screen lg:grid-cols-[270px_1fr]">
        <aside className="hidden border-r border-[#aeb6bf] bg-[#e4e8eb]/82 px-4 py-5 shadow-[inset_-1px_0_0_rgb(255_255_255_/_0.55)] backdrop-blur-xl lg:block">
          <Link className="flex items-center gap-3 px-2" to="/admin">
            <span className="grid size-10 place-items-center rounded-md bg-[#24282d] text-sm font-semibold text-[#f4f6f7]">
              A
            </span>
            <span>
              <span className="block text-sm font-semibold">Admin Console</span>
              <span className="block text-xs text-[#626b73]">Platform operations</span>
            </span>
          </Link>

          <nav className="mt-8 space-y-1">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);

              return (
                <Link
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-[#535b63] transition-colors",
                    active && "bg-[#24282d] text-[#f4f6f7]",
                    !active && "hover:bg-[#d5dbe0] hover:text-[#202326]",
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
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[#aeb6bf]/80 bg-[#eef1f3]/88 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#626b73]">
                  Administrative workspace
                </p>
                <p className="mt-1 text-sm text-[#535b63]">
                  {user?.display_name || user?.username} · {isRootUser(user) ? "Root" : "Admin"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium text-[#343a40] transition-colors hover:bg-[#dce1e5]"
                  to="/overview"
                >
                  User console
                </Link>
                <Button className="gap-2" onClick={handleSignOut} variant="secondary">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-[#c3c9cf] px-4 py-2 lg:hidden">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);

                return (
                  <Link
                    aria-label={item.label}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-[#535b63]",
                      active && "bg-[#24282d] text-[#f4f6f7]",
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

          <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
