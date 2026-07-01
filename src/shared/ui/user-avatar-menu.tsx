import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, UserRound, WalletCards } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@features/auth/store";
import { cn } from "@shared/lib/cn";

function getInitials(value?: string) {
  return (value || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
}

interface UserAvatarMenuProps {
  className?: string;
}

export function UserAvatarMenu({ className }: UserAvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const displayName = user?.display_name || user?.username || "Account";

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div className={cn("relative z-50", className)}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-11 place-items-center rounded-full border border-[#ddd4ca] bg-[#211d19] text-sm font-bold text-[#fffaf3] shadow-[0_12px_26px_rgb(59_45_34_/_0.16)] transition-transform hover:scale-[1.03]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {getInitials(displayName)}
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-3 w-56 rounded-xl border border-[#ddd4ca] bg-[#fffaf4] p-2 shadow-[0_24px_60px_rgb(49_39_28_/_0.18)]"
          role="menu"
        >
          <div className="border-b border-[#e4ddd5] px-3 py-3">
            <p className="truncate text-sm font-semibold text-[#181614]">{displayName}</p>
            <p className="mt-1 truncate text-xs font-medium text-[#74695f]">{user?.username}</p>
          </div>
          <Link
            className="mt-2 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#342d27] hover:bg-[#eee8e1]"
            onClick={() => setOpen(false)}
            role="menuitem"
            to="/wallet"
          >
            <WalletCards className="size-4" />
            Wallet
          </Link>
          <Link
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#342d27] hover:bg-[#eee8e1]"
            onClick={() => setOpen(false)}
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
  );
}
