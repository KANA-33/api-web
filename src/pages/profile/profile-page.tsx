import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  ChevronDown,
  KeyRound,
  Mail,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import * as authApi from "@features/auth/api";
import { useAuthStore } from "@features/auth/store";
import * as overviewApi from "@features/overview/api";
import { usePlatformStore } from "@features/platform/store";
import { formatQuota, formatQuotaFixed, formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Modal } from "@shared/ui/modal";
import { ErrorBlock } from "@shared/ui/state-block";

const fieldClass =
  "h-12 w-full rounded-lg border border-[#d7cec6] bg-[#fffdf8] px-4 text-sm font-semibold text-[#181614] outline-none transition-colors focus:border-[#4a433d] focus:ring-4 focus:ring-[#4a433d]/10";
const panelClass =
  "console-panel rounded-xl border border-[#ddd4ca]/82 bg-[#fffaf4]/82 text-[#181614] shadow-[0_18px_42px_rgb(74_58_42_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.62)] backdrop-blur-md";
const labelClass = "text-xs font-bold uppercase tracking-[0.14em] text-[#74695f]";

function formatUserId(id?: number) {
  return `USR-${String(id ?? 0).padStart(4, "0")}`;
}

function getRoleLabel(role?: number) {
  if ((role ?? 0) >= 100) {
    return "ROOT AGENT";
  }

  if ((role ?? 0) >= 10) {
    return "VERIFIED AGENT";
  }

  return "STANDARD AGENT";
}

function getInitials(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const refresh = useAuthStore((state) => state.refresh);
  const platformStatus = usePlatformStore((state) => state.status);
  const [language, setLanguage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const {
    data: usageSummary,
    error,
    loading,
    reload,
  } = useAsyncData(async () => {
    const response = await overviewApi.getUsageSummary();
    return response.data;
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      if (!language) {
        setMessage("No account setting changes to save.");
        return;
      }

      await authApi.updateCurrentUser({ language });
      await refresh();
      setMessage("Language setting saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Profile update failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setMessage(null);

    try {
      await authApi.updateCurrentUser({
        original_password: currentPassword,
        password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordOpen(false);
      setMessage("Password updated.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSendEmailCode() {
    setSendingEmailCode(true);
    setMessage(null);

    try {
      const targetEmail = emailDraft.trim();
      if (!targetEmail) {
        setMessage("Enter an email address first.");
        return;
      }

      await authApi.sendEmailVerification(targetEmail);
      setMessage("Verification code sent. Check your inbox.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Verification email failed.");
    } finally {
      setSendingEmailCode(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEmail(true);
    setMessage(null);

    try {
      await authApi.bindEmail({
        email: emailDraft.trim(),
        code: emailCode.trim(),
      });
      await refresh();
      setEmailCode("");
      setEmailOpen(false);
      setMessage("Email authentication updated.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Email update failed.");
    } finally {
      setSavingEmail(false);
    }
  }

  const accountName = user?.display_name || user?.username || "Account";
  const email = user?.email || "No email on file";
  const remainingQuota = Math.max((user?.quota ?? 0) - (user?.used_quota ?? 0), 0);
  const roleLabel = getRoleLabel(user?.role);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 pb-20 text-[#181614] lg:pb-0">
      <section className={`${panelClass} relative overflow-hidden px-6 py-4 md:px-7 lg:px-8`}>
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid size-28 shrink-0 place-items-center rounded-2xl border border-[#ddd4ca] bg-[#f8f4ee] text-3xl font-bold tracking-[-0.04em] text-[#6d6258] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.72)]">
            {getInitials(accountName) || <UserRound className="size-10" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="truncate text-[38px] font-semibold leading-none tracking-[-0.045em] text-[#1f1a16]">
                {accountName}
              </h1>
              <span className="inline-flex h-9 min-w-28 items-center justify-center rounded-lg border border-[#ddd4ca] bg-[#f1ebe4] px-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[#6d6258]">
                {roleLabel}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-base font-medium text-[#74695f]">
              <span>
                User ID: <strong className="text-[#2b2621]">{formatUserId(user?.id)}</strong>
              </span>
              <span>
                Email: <strong className="text-[#2b2621]">{email}</strong>
              </span>
              <span>
                Group: <strong className="text-[#2b2621]">{user?.group || "default"}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${panelClass} p-6`}>
          <p className={labelClass}>
            Current Balance
          </p>
          <strong className="mt-4 block text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#1f1a16]">
            {formatQuotaFixed(remainingQuota, platformStatus)}
          </strong>
          <div className="mt-8 flex items-center justify-between gap-4 text-sm font-semibold text-[#74695f]">
            <span>Wallet available</span>
            <Link
              className="inline-flex min-h-10 w-32 items-center justify-center rounded-lg border border-[#211d19] bg-[#211d19] px-4 text-center text-sm font-bold uppercase leading-tight text-[#fffaf3] shadow-[0_12px_28px_rgb(61_47_35_/_0.14)] transition-all hover:bg-[#332d27] active:translate-y-px"
              to="/wallet"
            >
              Add
              <br />
              Funds
            </Link>
          </div>
        </section>

        <section className={`${panelClass} p-6`}>
          <p className={labelClass}>
            Total Usage Cost
          </p>
          <strong className="mt-4 block text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#1f1a16]">
            {loading ? "..." : formatQuota(usageSummary?.quota, platformStatus)}
          </strong>
          <p className="mt-9 flex items-center gap-2 text-sm font-semibold text-[#9d514a]">
            <BarChart3 className="size-4" />
            Current account usage
          </p>
        </section>

        <section className={`${panelClass} p-6`}>
          <p className={labelClass}>
            API Requests Count
          </p>
          <strong className="mt-4 block text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#1f1a16]">
            {formatRawNumber(user?.request_count)}
          </strong>
          <p className="mt-9 flex items-center gap-2 text-sm font-semibold text-[#74695f]">
            <Activity className="size-4" />
            Total request count
          </p>
        </section>
      </div>

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Usage summary unavailable"
        />
      )}

      <section className={panelClass}>
        <div className="border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/64 px-6 py-7 md:px-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#1f1a16]">General Settings</h2>
          <p className="mt-2 text-base text-[#74695f]">
            Manage your account identity and system preferences.
          </p>
        </div>

        <form className="space-y-7 px-6 py-7 md:px-8" onSubmit={handleProfileSubmit}>
          <div className="flex flex-col gap-5 rounded-xl border border-[#ddd4ca]/88 bg-[#fffdf8]/72 px-5 py-5 shadow-[0_8px_20px_rgb(74_58_42_/_0.04)] md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <span className="grid size-12 place-items-center rounded-lg bg-[#eee8e1] text-[#6d6258]">
                <Mail className="size-6" />
              </span>
              <div>
                <p className="font-semibold text-[#1f1a16]">Email Authentication</p>
                <p className="mt-1 text-sm font-medium text-[#74695f]">{email} (Verified)</p>
              </div>
            </div>
            <button
              className="min-h-11 rounded-lg border border-[#d7cec6] bg-[#fffdf8] px-6 text-sm font-bold uppercase text-[#3b3736] shadow-[0_8px_18px_rgb(72_56_42_/_0.05)] transition-all hover:border-[#c9beb3] hover:bg-[#f2ede7] active:translate-y-px"
              onClick={() => {
                setEmailDraft(user?.email ?? "");
                setEmailCode("");
                setEmailOpen(true);
              }}
              type="button"
            >
              Update
              <br />
              Email
            </button>
          </div>

          <label className={`grid gap-3 ${labelClass}`}>
            System Language
            <span className="relative block">
              <select
                className={`${fieldClass} appearance-none text-base normal-case tracking-normal`}
                onChange={(event) => setLanguage(event.target.value)}
                value={language}
              >
                <option value="">Keep current language</option>
                <option value="en_US">English (US)</option>
                <option value="zh_CN">Chinese (Simplified)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#74695f]" />
            </span>
          </label>
          <p className="-mt-3 text-sm italic text-[#74695f]">
            Interface language will be synced across connected terminals and API logs.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {message && <p className="rounded-lg bg-[#f8f4ee] px-4 py-2 text-sm font-semibold text-[#3b3736]">{message}</p>}
            <button
              className="ml-auto min-h-11 rounded-lg border border-[#211d19] bg-[#211d19] px-7 text-sm font-bold uppercase text-[#fffaf3] shadow-[0_12px_28px_rgb(61_47_35_/_0.16)] transition-all hover:bg-[#332d27] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingProfile}
              type="submit"
            >
              {savingProfile ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </section>

      <section className={panelClass}>
        <div className="border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/64 px-6 py-7 md:px-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#1f1a16]">Security & Access</h2>
          <p className="mt-2 text-base text-[#74695f]">
            Configure authentication layers and token management.
          </p>
        </div>

        <div className="grid md:grid-cols-3">
          <button
            className="group min-h-36 border-b border-[#ddd4ca]/80 px-6 py-8 text-center transition-all hover:bg-[#f8f4ee]/72 md:border-b-0 md:border-r"
            onClick={() => setPasswordOpen(true)}
            type="button"
          >
            <RotateCcw className="mx-auto size-8 text-[#74695f] transition-colors group-hover:text-[#1f1a16]" />
            <span className="mt-5 block text-sm font-bold uppercase tracking-[0.08em] text-[#1f1a16]">
              Reset Password
            </span>
          </button>
          <Link
            className="group min-h-36 border-b border-[#ddd4ca]/80 px-6 py-8 text-center transition-all hover:bg-[#f8f4ee]/72 md:border-b-0 md:border-r"
            to="/api-keys"
          >
            <KeyRound className="mx-auto size-8 text-[#74695f] transition-colors group-hover:text-[#1f1a16]" />
            <span className="mt-5 block text-sm font-bold uppercase tracking-[0.08em] text-[#1f1a16]">
              API Tokens
            </span>
          </Link>
          <button
            className="group min-h-36 px-6 py-8 text-center transition-all hover:bg-[#f8f4ee]/72"
            onClick={() => setMessage("Account purge is not exposed by the current backend protocol.")}
            type="button"
          >
            <Trash2 className="mx-auto size-8 text-[#74695f] transition-colors group-hover:text-[#7f1d1d]" />
            <span className="mt-5 block text-sm font-bold uppercase tracking-[0.08em] text-[#1f1a16]">
              Purge Account
            </span>
          </button>
        </div>

      </section>

      <Modal
        description="Enter a new email address, send a verification code, then submit the code to bind it to this account."
        onClose={() => setEmailOpen(false)}
        open={emailOpen}
        title="Update email authentication"
      >
        <form className="grid gap-5" onSubmit={handleEmailSubmit}>
          <label className={`grid gap-2 ${labelClass}`}>
            Email address
            <input
              className={`${fieldClass} text-base normal-case tracking-normal`}
              onChange={(event) => setEmailDraft(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={emailDraft}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className={`grid gap-2 ${labelClass}`}>
              Verification code
              <input
                className={`${fieldClass} text-base normal-case tracking-normal`}
                onChange={(event) => setEmailCode(event.target.value)}
                placeholder="Enter verification code"
                required
                value={emailCode}
              />
            </label>
            <Button
              disabled={sendingEmailCode || !emailDraft.trim()}
              onClick={() => void handleSendEmailCode()}
              type="button"
              variant="secondary"
            >
              {sendingEmailCode ? "Sending..." : "Send code"}
            </Button>
          </div>
          <div className="rounded-xl border border-[#ddd4ca]/80 bg-[#f8f4ee]/70 px-4 py-3 text-sm font-medium leading-6 text-[#74695f]">
            The verification code is generated by the backend email verification flow and is required
            before the address can be bound.
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button onClick={() => setEmailOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={savingEmail || !emailDraft.trim() || !emailCode.trim()} type="submit">
              {savingEmail ? "Updating..." : "Update email"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description="Update your account password using the current credential."
        onClose={() => setPasswordOpen(false)}
        open={passwordOpen}
        title="Reset password"
      >
        <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
          <input
            className={fieldClass}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Current password"
            required
            type="password"
            value={currentPassword}
          />
          <input
            className={fieldClass}
            minLength={6}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            required
            type="password"
            value={newPassword}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setPasswordOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={savingPassword} type="submit">
              {savingPassword ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </Modal>

      <footer className="flex flex-col gap-4 border-t border-[#ddd4ca]/80 py-7 text-sm font-medium text-[#74695f] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#00ee1b]" />
            All Systems Operational
          </span>
          <span className="hidden text-[#b7aaa0] md:inline">|</span>
          <span>Last Sync: {new Date().toLocaleString()}</span>
        </div>
        <div className="flex gap-6 text-xs font-bold uppercase text-[#8a8078]">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}
