import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  BarChart3,
  Code2,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  ListTree,
  LogOut,
  PenLine,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useAuthStore } from "@features/auth/store";
import { cn } from "@shared/lib/cn";
import { isAdminUser } from "@shared/lib/roles";

const navigation = [
  { label: "Overview", to: "/overview", icon: BarChart3 },
  { label: "Playground", to: "/playground", icon: Code2 },
  { label: "Analytics", to: "/models", icon: ListTree },
  { label: "Logs", to: "/logs", icon: PenLine },
  { label: "API Keys", to: "/api-keys", icon: KeyRound },
  { label: "Wallet", to: "/wallet", icon: CreditCard },
  { label: "Account", to: "/profile", icon: UserRound },
];

function getLegacyAdminUrl() {
  const configuredUrl = import.meta.env.PUBLIC_LEGACY_ADMIN_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL?.trim();

  if (apiBaseUrl) {
    return new URL("/admin", apiBaseUrl).toString();
  }

  return "/admin";
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/models/")) {
    return "Model Detail";
  }

  if (pathname === "/models") {
    return "Analytics";
  }

  const matched = navigation.find((item) => item.to === pathname);
  return matched?.label ?? "Overview";
}

function getInitials(value?: string) {
  return (value || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
}

export function AppShell() {
  const routeSurfaceRef = useRef<HTMLElement | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const pageTitle = getPageTitle(pathname);
  const displayName = user?.display_name || user?.username || "Account";
  const legacyAdminUrl = getLegacyAdminUrl();

  async function handleSignOut() {
    setProfileMenuOpen(false);
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#ddd4ca]/80 bg-[#f8f4ee]/88 px-4 py-7 shadow-[18px_0_48px_rgb(87_69_50_/_0.06)] backdrop-blur-xl md:flex">
        <Link className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#eee8e1]" to="/overview">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#211d19] text-base font-bold text-[#fffaf3]">
            T
          </span>
          <span>
            <span className="block text-lg font-semibold leading-none tracking-[-0.02em] text-[#1f1a16]">
              Test API
            </span>
            <span className="mt-1 block text-xs font-semibold text-[#74695f]">v2.4.0-stable</span>
          </span>
        </Link>

        <nav className="mt-10 grid gap-1.5">
          {navigation.map((item) => {
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

      </aside>

      <div className="min-h-[100dvh] md:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/78 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1520px] items-center justify-between gap-4 px-5 md:px-8">
            <Link className="flex items-center gap-3 md:hidden" to="/overview">
              <span className="grid size-9 place-items-center rounded-lg bg-[#211d19] text-sm font-bold text-[#fffaf3]">
                C
              </span>
              <span className="text-sm font-bold uppercase tracking-[0.1em]">Console</span>
            </Link>
            <h1 className="hidden truncate text-[28px] font-semibold leading-none tracking-[-0.04em] text-[#1f1a16] md:block">
              {pageTitle}
            </h1>
            <div className="ml-auto flex items-center gap-3">
              {isAdminUser(user) && (
                <a
                  className="hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#2b2621] transition-colors hover:bg-[#eee8e1] lg:inline-flex"
                  href={legacyAdminUrl}
                >
                  <LayoutDashboard className="size-4" />
                  Admin
                </a>
              )}
              <div className="relative">
                <button
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  className="grid size-11 place-items-center rounded-full border border-[#ddd4ca] bg-[#211d19] text-sm font-bold text-[#fffaf3] shadow-[0_12px_26px_rgb(59_45_34_/_0.16)] transition-transform hover:scale-[1.03]"
                  onClick={() => setProfileMenuOpen((value) => !value)}
                  type="button"
                >
                  {getInitials(displayName)}
                </button>
                {profileMenuOpen && (
                  <div
                    className="absolute right-0 mt-3 w-56 rounded-xl border border-[#ddd4ca] bg-[#fffaf4] p-2 shadow-[0_24px_60px_rgb(49_39_28_/_0.18)]"
                    role="menu"
                  >
                    <div className="border-b border-[#e4ddd5] px-3 py-3">
                      <p className="truncate text-sm font-semibold text-[#181614]">{displayName}</p>
                      <p className="mt-1 truncate text-xs font-medium text-[#74695f]">
                        {user?.username}
                      </p>
                    </div>
                    <Link
                      className="mt-2 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#342d27] hover:bg-[#eee8e1]"
                      onClick={() => setProfileMenuOpen(false)}
                      role="menuitem"
                      to="/wallet"
                    >
                      <WalletCards className="size-4" />
                      Wallet
                    </Link>
                    <Link
                      className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#342d27] hover:bg-[#eee8e1]"
                      onClick={() => setProfileMenuOpen(false)}
                      role="menuitem"
                      to="/profile"
                    >
                      <UserRound className="size-4" />
                      Account
                    </Link>
                    <button
                      className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[#7f1d1d] hover:bg-[#f7e8e4]"
                      onClick={() => void handleSignOut()}
                      role="menuitem"
                      type="button"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main
          className="route-surface mx-auto max-w-[1520px] px-5 py-9 md:px-10 lg:py-12 xl:px-12"
          ref={routeSurfaceRef}
        >
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 grid rounded-2xl border border-[#ddd4ca]/85 bg-[#fffaf4]/90 px-2 py-2 shadow-[0_18px_44px_rgb(74_58_42_/_0.16)] backdrop-blur-xl md:hidden">
        {navigation.map((item) => {
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
