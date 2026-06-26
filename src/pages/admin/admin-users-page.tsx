import { useState, type FormEvent } from "react";
import {
  BadgeCheck,
  BadgeX,
  Pencil,
  RefreshCw,
  Shield,
  ShieldOff,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import * as usersApi from "@features/admin/users/api";
import type { AdminUser } from "@features/admin/users/api";
import { usePlatformStore } from "@features/platform/store";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { ROLE_ADMIN, ROLE_ROOT } from "@shared/lib/roles";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const ROLE_COMMON = 1;
const STATUS_ENABLED = 1;
const STATUS_DISABLED = 2;
const pageSize = 20;

interface UserFormState {
  displayName: string;
  group: string;
  password: string;
  remark: string;
  role: string;
  username: string;
}

const defaultForm: UserFormState = {
  displayName: "",
  group: "default",
  password: "",
  remark: "",
  role: String(ROLE_COMMON),
  username: "",
};

function getRoleLabel(role: number) {
  if (role >= ROLE_ROOT) {
    return "Root";
  }

  if (role >= ROLE_ADMIN) {
    return "Admin";
  }

  return "User";
}

function getStatusLabel(status: number) {
  return status === STATUS_DISABLED ? "Disabled" : "Enabled";
}

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleDateString();
}

function toEditForm(user: AdminUser): UserFormState {
  return {
    displayName: user.display_name ?? "",
    group: user.group ?? "default",
    password: "",
    remark: user.remark ?? "",
    role: String(user.role),
    username: user.username,
  };
}

function toUpdateRequest(user: AdminUser, form: UserFormState): usersApi.UpdateUserRequest {
  return {
    display_name: form.displayName.trim() || form.username.trim(),
    group: form.group.trim() || "default",
    id: user.id,
    ...(form.password ? { password: form.password } : {}),
    remark: form.remark.trim(),
    role: user.role,
    status: user.status,
    username: form.username.trim(),
  };
}

export function AdminUsersPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const platformStatus = usePlatformStore((state) => state.status);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [group, setGroup] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    group: "",
    keyword: "",
    role: "",
    status: "",
  });
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(defaultForm);
  const [quotaUser, setQuotaUser] = useState<AdminUser | null>(null);
  const [quotaMode, setQuotaMode] = useState<"add" | "override" | "subtract">("add");
  const [quotaValue, setQuotaValue] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const hasFilters = Object.values(appliedFilters).some(Boolean);
    const query = {
      p: page,
      page_size: pageSize,
      group: appliedFilters.group || undefined,
      keyword: appliedFilters.keyword || undefined,
      role: appliedFilters.role ? Number(appliedFilters.role) : undefined,
      status: appliedFilters.status ? Number(appliedFilters.status) : undefined,
    };

    const response = hasFilters
      ? await usersApi.searchUsers(query)
      : await usersApi.listUsers(query);
    return response.data;
  }, [page, appliedFilters]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      group: group.trim(),
      keyword: keyword.trim(),
      role,
      status,
    });
  }

  function openCreateForm() {
    setForm(defaultForm);
    setEditingUser(null);
    setFormMode("create");
    setQuotaUser(null);
    setActionMessage(null);
  }

  function openEditForm(user: AdminUser) {
    setForm(toEditForm(user));
    setEditingUser(user);
    setFormMode("edit");
    setQuotaUser(null);
    setActionMessage(null);
  }

  function closePanels() {
    setFormMode(null);
    setEditingUser(null);
    setQuotaUser(null);
    setActionMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    const username = form.username.trim();
    if (!username) {
      setActionMessage("Username is required.");
      return;
    }

    try {
      if (formMode === "create") {
        if (!form.password) {
          setActionMessage("Password is required for new users.");
          return;
        }

        await usersApi.createUser({
          display_name: form.displayName.trim() || username,
          password: form.password,
          role: Number(form.role),
          username,
        });
        setActionMessage("User created.");
      } else if (editingUser) {
        await usersApi.updateUser(toUpdateRequest(editingUser, form));
        setActionMessage("User updated.");
      }

      setFormMode(null);
      setEditingUser(null);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "User action failed");
    }
  }

  async function handleManage(user: AdminUser, action: usersApi.ManageUserAction) {
    const confirmations: Partial<
      Record<
        usersApi.ManageUserAction,
        {
          actionLabel: string;
          confirmText?: string;
          description: string;
          title: string;
        }
      >
    > = {
      delete: {
        actionLabel: "Delete user",
        confirmText: user.username,
        description: `This permanently removes user "${user.username}" and can affect their API keys, logs, and billing history visibility.`,
        title: "Delete user",
      },
      demote: {
        actionLabel: "Demote user",
        description: `This removes admin permissions from "${user.username}".`,
        title: "Demote admin",
      },
      disable: {
        actionLabel: "Disable user",
        description: `This prevents "${user.username}" from using the platform until re-enabled.`,
        title: "Disable user",
      },
      enable: {
        actionLabel: "Enable user",
        description: `This restores platform access for "${user.username}".`,
        title: "Enable user",
      },
      promote: {
        actionLabel: "Promote user",
        description: `This grants admin permissions to "${user.username}".`,
        title: "Promote to admin",
      },
    };
    const confirmation = confirmations[action];

    if (confirmation) {
      const result = await confirmSensitive({
        ...confirmation,
        reasonLabel: "Reason for audit context",
      });

      if (!result.confirmed) {
        return;
      }
    }

    setActionMessage(null);

    try {
      if (action === "delete") {
        await usersApi.deleteUser(user.id);
      } else {
        await usersApi.manageUser({ action, id: user.id });
      }

      setActionMessage("User action completed.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "User action failed");
    }
  }

  async function handleQuota(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quotaUser) {
      return;
    }

    const value = Number(quotaValue);
    if (!Number.isFinite(value) || value < 0) {
      setActionMessage("Enter a valid quota value.");
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Update quota",
      description: `This will ${quotaMode} ${value} raw quota unit(s) for "${quotaUser.username}". Balance changes can affect active API usage immediately.`,
      reasonLabel: "Reason for audit context",
      title: "Update user quota",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await usersApi.manageUser({
        action: "add_quota",
        id: quotaUser.id,
        mode: quotaMode,
        value,
      });
      setActionMessage("Quota updated.");
      setQuotaUser(null);
      setQuotaValue("");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Quota update failed");
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="Search, provision, edit, suspend, and rebalance platform accounts from one operational surface."
          title="Users"
        />
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => void reload()} variant="secondary">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button className="gap-2" onClick={openCreateForm}>
            <UserPlus className="size-4" />
            Create user
          </Button>
        </div>
      </div>

      <Card>
        <form
          className="grid gap-3 lg:grid-cols-[1.5fr_0.85fr_0.75fr_0.75fr_auto]"
          onSubmit={applyFilters}
        >
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search username, email, display name, or ID"
            value={keyword}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setGroup(event.target.value)}
            placeholder="Group"
            value={group}
          />
          <select
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setRole(event.target.value)}
            value={role}
          >
            <option value="">Any role</option>
            <option value={ROLE_COMMON}>User</option>
            <option value={ROLE_ADMIN}>Admin</option>
            <option value={ROLE_ROOT}>Root</option>
          </select>
          <select
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Any status</option>
            <option value={STATUS_ENABLED}>Enabled</option>
            <option value={STATUS_DISABLED}>Disabled</option>
            <option value={-1}>Deleted</option>
          </select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {(formMode || quotaUser || actionMessage) && (
        <Card className="border-[#c9baa4]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {formMode === "create"
                  ? "Create user"
                  : formMode === "edit"
                    ? `Edit ${editingUser?.username}`
                    : quotaUser
                      ? `Adjust quota for ${quotaUser.username}`
                      : "User action"}
              </h2>
              {actionMessage && (
                <p className="mt-2 text-sm leading-6 text-[#655b50]">{actionMessage}</p>
              )}
            </div>
            <button
              aria-label="Close"
              className="rounded-md p-2 text-[#6d6256] hover:bg-[#eadfce]"
              onClick={closePanels}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {formMode && (
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Username
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  maxLength={20}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, username: event.target.value }))
                  }
                  required
                  value={form.username}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Display name
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  maxLength={20}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, displayName: event.target.value }))
                  }
                  value={form.displayName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Password
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  maxLength={20}
                  minLength={8}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, password: event.target.value }))
                  }
                  placeholder={
                    formMode === "edit"
                      ? "Leave blank to keep current password"
                      : "8 to 20 characters"
                  }
                  required={formMode === "create"}
                  type="password"
                  value={form.password}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Role
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e] disabled:opacity-60"
                  disabled={formMode === "edit"}
                  onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}
                  value={form.role}
                >
                  <option value={ROLE_COMMON}>User</option>
                  <option value={ROLE_ADMIN}>Admin</option>
                </select>
              </label>
              {formMode === "edit" && (
                <>
                  <label className="grid gap-2 text-sm font-medium">
                    Group
                    <input
                      className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                      onChange={(event) =>
                        setForm((value) => ({ ...value, group: event.target.value }))
                      }
                      value={form.group}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Remark
                    <input
                      className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                      maxLength={255}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, remark: event.target.value }))
                      }
                      value={form.remark}
                    />
                  </label>
                </>
              )}
              <Button className="justify-self-start md:col-span-2" type="submit">
                {formMode === "create" ? "Create user" : "Save user"}
              </Button>
            </form>
          )}

          {quotaUser && (
            <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleQuota}>
              <select
                className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                onChange={(event) =>
                  setQuotaMode(event.target.value as "add" | "override" | "subtract")
                }
                value={quotaMode}
              >
                <option value="add">Add quota</option>
                <option value="subtract">Subtract quota</option>
                <option value="override">Override quota</option>
              </select>
              <input
                className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                min={0}
                onChange={(event) => setQuotaValue(event.target.value)}
                placeholder="Raw quota value"
                required
                type="number"
                value={quotaValue}
              />
              <Button type="submit">Apply</Button>
            </form>
          )}
        </Card>
      )}

      {loading && <LoadingBlock title="Loading users" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Users unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock
          actionLabel="Create user"
          description="No users match the current filters. Create a user or clear the search criteria."
          onAction={openCreateForm}
          title="No users found"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">User directory</h2>
              <p className="mt-2 text-sm text-[#655b50]">
                Showing {data.items.length} of {data.total} accounts.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">User</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Role</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Group</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Quota</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Requests</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Last login</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="font-medium text-[#2d2926]">
                        {user.display_name || user.username}
                      </div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        #{user.id} · {user.username}
                        {user.email ? ` · ${user.email}` : ""}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <span className="rounded-md border border-[#d8cbb8] bg-[#f7f0e8] px-2 py-1 text-xs font-medium">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {user.status === STATUS_DISABLED ? (
                          <BadgeX className="size-4 text-[#8a4d3d]" />
                        ) : (
                          <BadgeCheck className="size-4 text-[#63785f]" />
                        )}
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {user.group || "default"}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>{formatQuota(user.quota, platformStatus)}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        Used {formatQuota(user.used_quota, platformStatus)}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatRawNumber(user.request_count)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatTime(user.last_login_at)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          aria-label="Edit user"
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => openEditForm(user)}
                          type="button"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          aria-label="Adjust quota"
                          className="rounded-md px-2 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => {
                            setQuotaUser(user);
                            setFormMode(null);
                            setEditingUser(null);
                            setActionMessage(null);
                          }}
                          type="button"
                        >
                          Quota
                        </button>
                        <button
                          aria-label={
                            user.status === STATUS_DISABLED ? "Enable user" : "Disable user"
                          }
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() =>
                            void handleManage(
                              user,
                              user.status === STATUS_DISABLED ? "enable" : "disable",
                            )
                          }
                          type="button"
                        >
                          {user.status === STATUS_DISABLED ? (
                            <BadgeCheck className="size-4" />
                          ) : (
                            <BadgeX className="size-4" />
                          )}
                        </button>
                        {user.role >= ROLE_ADMIN ? (
                          <button
                            aria-label="Demote user"
                            className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleManage(user, "demote")}
                            type="button"
                          >
                            <ShieldOff className="size-4" />
                          </button>
                        ) : (
                          <button
                            aria-label="Promote user"
                            className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleManage(user, "promote")}
                            type="button"
                          >
                            <Shield className="size-4" />
                          </button>
                        )}
                        <button
                          aria-label="Delete user"
                          className="rounded-md p-2 text-[#7a4a3b] hover:bg-[#f0dfd2]"
                          onClick={() => void handleManage(user, "delete")}
                          type="button"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-[#655b50]">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              variant="secondary"
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
