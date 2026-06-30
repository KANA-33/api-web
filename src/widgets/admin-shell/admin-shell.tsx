import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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
  const routeSurfaceRef = useRef<HTMLElement | null>(null);
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

  useGSAP(
    () => {
      if (!routeSurfaceRef.current) {
        return;
      }

      gsap.fromTo(
        routeSurfaceRef.current,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          clearProps: "opacity,visibility,transform",
          duration: 0.32,
          ease: "power3.out",
          y: 0,
        },
      );
    },
    { dependencies: [pathname], scope: routeSurfaceRef },
  );

  return (
    <div className="min-h-[100dvh] text-[#181614]">
      <div className="grid min-h-[100dvh] lg:grid-cols-[288px_1fr]">
        <aside className="hidden border-r border-[#ddd4ca]/80 bg-[#f8f4ee]/88 px-5 py-8 shadow-[18px_0_48px_rgb(87_69_50_/_0.06)] backdrop-blur-xl lg:block">
          <Link to="/admin">
            <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1f1a16]">
              Admin
              <br />
              Console
            </h1>
            <p className="mt-3 text-sm font-medium text-[#74695f]">Platform operations</p>
          </Link>

          <nav className="mt-12 grid gap-1.5">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);

              return (
                <Link
                  className={cn(
                    "flex h-11 items-center gap-4 rounded-lg px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#6d6258] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#eee8e1] hover:text-[#181614]",
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
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/78 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1520px] items-center justify-between gap-4 px-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#74695f]">
                  Administrative workspace
                </p>
                <p className="mt-1 text-sm font-medium text-[#74695f]">
                  {user?.display_name || user?.username} · {isRootUser(user) ? "Root" : "Admin"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#2b2621] transition-colors hover:bg-[#eee8e1]"
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
            <nav className="flex gap-1 overflow-x-auto border-t border-[#ddd4ca]/80 px-4 py-2 lg:hidden">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);

                return (
                  <Link
                    aria-label={item.label}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#6d6258] transition-colors hover:bg-[#eee8e1]",
                      active && "bg-[#211d19] !text-[#fffaf3] [&_svg]:!text-[#fffaf3]",
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

          <main
            className="route-surface mx-auto max-w-[1520px] px-5 py-9 md:px-10 lg:py-12 xl:px-12"
            ref={routeSurfaceRef}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
