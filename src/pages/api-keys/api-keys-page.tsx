import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarClock,
  Coins,
  Eye,
  Hash,
  KeyRound,
  Layers3,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import * as apiKeysApi from "@features/api-keys/api";
import { useAuthStore } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import type { ApiKeyRecord } from "@shared/api/contracts";
import { formatQuota } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { Modal } from "@shared/ui/modal";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

interface ApiKeyFormState {
  name: string;
  group: string;
  expirationMode: "datetime" | "never";
  expirationDateTime: string;
  quantity: string;
  unlimitedQuota: boolean;
  quotaUsd: string;
}

const defaultFormState: ApiKeyFormState = {
  name: "",
  group: "",
  expirationMode: "never",
  expirationDateTime: "",
  quantity: "1",
  unlimitedQuota: true,
  quotaUsd: "",
};

const apiKeyGridClass =
  "grid gap-4 xl:grid-cols-[1.05fr_1.6fr_1fr_0.95fr_0.75fr_0.8fr]";
const formFieldClass =
  "h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm font-semibold text-[#242121] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.74)] outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:border-[#211d19] focus:shadow-[0_0_0_4px_rgb(33_29_25_/_0.08),inset_0_1px_0_rgb(255_255_255_/_0.74)] disabled:cursor-not-allowed disabled:bg-[#f0ece8] disabled:text-[#8a8078]";
const formLabelClass = "grid gap-2 text-sm font-semibold text-[#2b2621]";

function formatTime(timestamp: number) {
  if (timestamp <= 0) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleDateString();
}

function toDateTimeLocal(timestamp: number) {
  if (timestamp <= 0) {
    return "";
  }

  const date = new Date(timestamp * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getExpirationTimestamp(form: ApiKeyFormState) {
  if (form.expirationMode === "never") {
    return -1;
  }

  const timestamp = Math.floor(new Date(form.expirationDateTime).getTime() / 1000);
  return Number.isFinite(timestamp) ? timestamp : -1;
}

function quotaToUsd(quota: number, quotaPerUnit: number) {
  if (quotaPerUnit <= 0) {
    return "0";
  }

  return String(Number((quota / quotaPerUnit).toFixed(6)));
}

function usdToQuota(value: string, quotaPerUnit: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * Math.max(quotaPerUnit, 1));
}

function toRequest(form: ApiKeyFormState, quotaPerUnit: number) {
  return {
    name: form.name.trim(),
    expired_time: getExpirationTimestamp(form),
    remain_quota: form.unlimitedQuota ? 0 : usdToQuota(form.quotaUsd, quotaPerUnit),
    unlimited_quota: form.unlimitedQuota,
    group: form.group.trim(),
  };
}

function getQuantity(value: string) {
  const quantity = Number.parseInt(value, 10);
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(quantity, 50));
}

function normalizeGroups(payload: string[] | apiKeysApi.UserGroupsData | undefined) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.usable_groups ?? payload?.groups ?? [];
}

function toSearchPattern(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return `%${trimmed.replaceAll("%", "")}%`;
}

function ApiKeyCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6c6a67] xl:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}

export function ApiKeysPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const user = useAuthStore((state) => state.user);
  const platformStatus = usePlatformStore((state) => state.status);
  const quotaPerUnit = platformStatus?.quota_per_unit && platformStatus.quota_per_unit > 0
    ? platformStatus.quota_per_unit
    : 500_000;
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyRecord | null>(null);
  const [form, setForm] = useState<ApiKeyFormState>(defaultFormState);
  const [, setActionMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const pageSize = 20;

  const { data, error, loading, reload } = useAsyncData(async () => {
    const query = {
      p: page,
      page_size: pageSize,
      keyword: toSearchPattern(appliedKeyword),
    };
    const response = appliedKeyword
      ? await apiKeysApi.searchApiKeys(query)
      : await apiKeysApi.listApiKeys(query);
    return response.data;
  }, [page, appliedKeyword]);

  const { data: groupsData } = useAsyncData(async () => {
    const response = await apiKeysApi.getUserGroups();
    return response.data;
  }, []);

  const groupOptions = useMemo(() => {
    const values = normalizeGroups(groupsData);
    const fallback = user?.group || "default";
    return Array.from(new Set([fallback, ...values].filter(Boolean)));
  }, [groupsData, user?.group]);

  function openCreateForm() {
    setEditingKey(null);
    setForm({ ...defaultFormState, group: user?.group || "default" });
    setFormOpen(true);
    setActionMessage(null);
    setRevealedKey(null);
  }

  function openEditForm(key: ApiKeyRecord) {
    setEditingKey(key);
    setForm({
      name: key.name,
      unlimitedQuota: key.unlimited_quota,
      expirationMode: key.expired_time > 0 ? "datetime" : "never",
      expirationDateTime: toDateTimeLocal(key.expired_time),
      quantity: "1",
      quotaUsd: quotaToUsd(key.remain_quota, quotaPerUnit),
      group: key.group ?? "",
    });
    setFormOpen(true);
    setActionMessage(null);
    setRevealedKey(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setRevealedKey(null);

    const request = toRequest(form, quotaPerUnit);
    if (!request.name) {
      setActionMessage("Name is required.");
      return;
    }

    if (form.expirationMode === "datetime" && !form.expirationDateTime) {
      setActionMessage("Expiration date and time is required.");
      return;
    }

    if (!form.unlimitedQuota && Number(form.quotaUsd) < 0) {
      setActionMessage("Quota must be zero or greater.");
      return;
    }

    try {
      if (editingKey) {
        await apiKeysApi.updateApiKey({ id: editingKey.id, ...request });
        setActionMessage("API key updated.");
      } else {
        const quantity = getQuantity(form.quantity);
        for (let index = 0; index < quantity; index += 1) {
          await apiKeysApi.createApiKey({
            ...request,
            name: quantity > 1 ? `${request.name}-${index + 1}` : request.name,
          });
        }
        setActionMessage(
          quantity > 1
            ? `${quantity} API keys created. Use reveal after refresh if you need the secrets.`
            : "API key created. Use reveal after refresh if you need the secret.",
        );
      }

      setFormOpen(false);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Action failed");
    }
  }

  async function handleReveal(id: number) {
    setActionMessage(null);

    try {
      const response = await apiKeysApi.revealApiKey(id);
      setRevealedKey(response.data.key);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Reveal failed");
    }
  }

  async function handleDelete(key: ApiKeyRecord) {
    const result = await confirmSensitive({
      actionLabel: "Delete API key",
      confirmText: key.name,
      description: `This permanently deletes API key "${key.name}". Applications using this credential will stop working immediately.`,
      reasonLabel: "Reason for audit context",
      title: "Delete API key",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await apiKeysApi.deleteApiKey(key.id);
      setActionMessage("API key deleted.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Delete failed");
    }
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  useGSAP(
    () => {
      if (!formOpen && !revealedKey) {
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        gsap.set("[data-apikey-modal-animate]", { autoAlpha: 1, clearProps: "all" });
        return;
      }

      gsap.fromTo(
        "[data-apikey-modal-animate]",
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          clearProps: "opacity,visibility,transform",
          duration: 0.44,
          ease: "power3.out",
          stagger: 0.045,
          y: 0,
        },
      );
    },
    { dependencies: [formOpen, revealedKey] },
  );

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => void reload()} variant="secondary">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button onClick={openCreateForm}>Create key</Button>
        </div>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
          <input
            className="h-10 flex-1 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by key name or token"
            value={keyword}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <Modal
        className="max-w-3xl"
        description={
          formOpen
            ? "Configure access scope, expiry, and quota before issuing credentials."
            : undefined
        }
        onClose={() => {
          setFormOpen(false);
          setActionMessage(null);
          setRevealedKey(null);
        }}
        open={formOpen || Boolean(revealedKey)}
        title={formOpen ? (editingKey ? "Edit key" : "Create key") : "Key action"}
      >
          {revealedKey && (
            <div
              className="rounded-xl border border-[#d8d2d2] bg-[#fbf9f9] p-4 font-mono text-xs text-[#242121]"
              data-apikey-modal-animate
            >
              {revealedKey}
            </div>
          )}

          {formOpen && (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <section
                className="overflow-hidden rounded-xl border border-[#d8cec3]/82 bg-[#fffaf4]/82 shadow-[0_18px_42px_rgb(83_66_48_/_0.06),inset_0_1px_0_rgb(255_255_255_/_0.62)]"
                data-apikey-modal-animate
              >
                <div className="flex items-center justify-between border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/76 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-[#211d19] text-[#fffaf3]">
                      <KeyRound className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#181614]">
                        基本信息
                      </h3>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#74695f]">
                        Identity and lifecycle
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  <label className={formLabelClass} data-apikey-modal-animate>
                    <span>名称</span>
                    <input
                      className={formFieldClass}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, name: event.target.value }))
                      }
                      required
                      value={form.name}
                    />
                  </label>
                  <label className={formLabelClass} data-apikey-modal-animate>
                    <span className="inline-flex items-center gap-2">
                      <Layers3 className="size-4 text-[#74695f]" />
                      分组
                    </span>
                    <select
                      className={formFieldClass}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, group: event.target.value }))
                      }
                      value={form.group}
                    >
                      {groupOptions.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={`${formLabelClass} md:col-span-2`} data-apikey-modal-animate>
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock className="size-4 text-[#74695f]" />
                      过期时间
                    </span>
                    <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
                      <select
                        className={formFieldClass}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            expirationMode: event.target.value as ApiKeyFormState["expirationMode"],
                          }))
                        }
                        value={form.expirationMode}
                      >
                        <option value="never">永不</option>
                        <option value="datetime">时间段</option>
                      </select>
                      <input
                        className={formFieldClass}
                        disabled={form.expirationMode === "never"}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            expirationDateTime: event.target.value,
                          }))
                        }
                        type="datetime-local"
                        value={form.expirationDateTime}
                      />
                    </div>
                  </div>
                  {!editingKey && (
                    <label className={formLabelClass} data-apikey-modal-animate>
                      <span className="inline-flex items-center gap-2">
                        <Hash className="size-4 text-[#74695f]" />
                        数量
                      </span>
                      <input
                        className={formFieldClass}
                        min={1}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, quantity: event.target.value }))
                        }
                        step={1}
                        type="number"
                        value={form.quantity}
                      />
                    </label>
                  )}
                </div>
              </section>

              <section
                className="overflow-hidden rounded-xl border border-[#d8cec3]/82 bg-[#fffaf4]/82 shadow-[0_18px_42px_rgb(83_66_48_/_0.06),inset_0_1px_0_rgb(255_255_255_/_0.62)]"
                data-apikey-modal-animate
              >
                <div className="flex items-center justify-between border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/76 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-[#211d19] text-[#fffaf3]">
                      <Coins className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#181614]">
                        额度设置
                      </h3>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#74695f]">
                        Budget and spend limits
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 p-5">
                  <label
                    className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[#d8d2d2] bg-[#fffdfd] px-4 text-sm font-semibold text-[#2b2621] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.74)] transition-colors hover:bg-[#fbf8f5]"
                    data-apikey-modal-animate
                  >
                    无限配额
                    <input
                      checked={form.unlimitedQuota}
                      className="size-5 accent-[#211d19]"
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          unlimitedQuota: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                  </label>
                  {!form.unlimitedQuota && (
                    <label className={formLabelClass} data-apikey-modal-animate>
                      <span>额度（USD）</span>
                      <input
                        className={formFieldClass}
                        min={0}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, quotaUsd: event.target.value }))
                        }
                        placeholder="0"
                        step="0.01"
                        type="number"
                        value={form.quotaUsd}
                      />
                    </label>
                  )}
                </div>
              </section>

              <div className="flex justify-end gap-3 border-t border-[#ddd4ca]/80 pt-5" data-apikey-modal-animate>
                <Button
                  onClick={() => {
                    setFormOpen(false);
                    setActionMessage(null);
                    setRevealedKey(null);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button type="submit">{editingKey ? "Save key" : "Create key"}</Button>
              </div>
            </form>
          )}
      </Modal>

      {loading && <LoadingBlock title="Loading API keys" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="API keys unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock
          actionLabel="Create key"
          description=""
          onAction={openCreateForm}
          title="No API keys yet"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Credential inventory</h2>
            </div>
          </div>
          <div className="mt-6">
            <div
              className={`${apiKeyGridClass} hidden border-b border-[#d8d2d2] px-5 pb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6c6a67] xl:grid`}
            >
              <span>Name</span>
              <span>Key</span>
              <span>Quota</span>
              <span>Last used</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="mt-3 space-y-3">
              {data.items.map((key) => (
                <article
                  className={`${apiKeyGridClass} border border-[#d8d2d2] bg-[#fbf9f9] px-5 py-5 text-sm transition-colors hover:bg-[#f3f1f1]`}
                  key={key.id}
                >
                  <ApiKeyCell label="Name">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-xs font-bold text-white">
                        {key.name.trim().charAt(0).toUpperCase() || "K"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#242121]">{key.name}</p>
                      </div>
                    </div>
                  </ApiKeyCell>

                  <ApiKeyCell label="Key">
                    <p className="flex min-w-0 items-center gap-2 font-mono text-xs font-semibold text-[#3b3736]">
                      <KeyRound className="size-4 shrink-0 text-[#6c6a67]" />
                      <span className="truncate">{key.key}</span>
                    </p>
                  </ApiKeyCell>

                  <ApiKeyCell label="Quota">
                    <p className="font-bold text-black">
                      {key.unlimited_quota
                        ? "Unlimited"
                        : formatQuota(key.remain_quota, platformStatus)}
                    </p>
                  </ApiKeyCell>

                  <ApiKeyCell label="Last used">
                    <p className="font-semibold text-[#3b3736]">{formatTime(key.accessed_time)}</p>
                  </ApiKeyCell>

                  <ApiKeyCell label="Status">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                        key.status === 1
                          ? "border-[#a7dfc7] bg-[#ecfdf5] text-[#047857]"
                          : "border-[#e7c6c6] bg-[#fff1f1] text-[#7f1d1d]"
                      }`}
                    >
                      <ShieldCheck className="size-4" />
                      {key.status === 1 ? "Active" : "Inactive"}
                    </span>
                  </ApiKeyCell>

                  <ApiKeyCell label="Actions">
                    <div className="flex gap-1 xl:justify-end">
                      <button
                        aria-label="Reveal key"
                        className="grid size-9 place-items-center rounded-[2px] border border-[#d4cece] bg-[#fffdfd] text-[#3b3736] hover:bg-[#efeded]"
                        onClick={() => void handleReveal(key.id)}
                        type="button"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        aria-label="Edit key"
                        className="grid size-9 place-items-center rounded-[2px] border border-[#d4cece] bg-[#fffdfd] text-[#3b3736] hover:bg-[#efeded]"
                        onClick={() => openEditForm(key)}
                        type="button"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label="Delete key"
                        className="grid size-9 place-items-center rounded-[2px] border border-[#e4caca] bg-[#fffdfd] text-[#7f1d1d] hover:bg-[#fff1f1]"
                        onClick={() => void handleDelete(key)}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </ApiKeyCell>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-sm text-[#5f5958]">
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
