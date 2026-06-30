import { useState, type FormEvent, type ReactNode } from "react";
import { Eye, KeyRound, Pencil, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import * as apiKeysApi from "@features/api-keys/api";
import { usePlatformStore } from "@features/platform/store";
import type { ApiKeyRecord } from "@shared/api/contracts";
import { formatQuota } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { Modal } from "@shared/ui/modal";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

interface ApiKeyFormState {
  name: string;
  remainQuota: string;
  unlimitedQuota: boolean;
  expiredTime: string;
  group: string;
}

const defaultFormState: ApiKeyFormState = {
  name: "",
  remainQuota: "0",
  unlimitedQuota: true,
  expiredTime: "-1",
  group: "",
};

const apiKeyGridClass =
  "grid gap-4 xl:grid-cols-[1.05fr_1.6fr_1fr_0.95fr_0.75fr_0.8fr]";

function formatTime(timestamp: number) {
  if (timestamp <= 0) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleDateString();
}

function toRequest(form: ApiKeyFormState) {
  return {
    name: form.name.trim(),
    expired_time: Number(form.expiredTime) || -1,
    remain_quota: Number(form.remainQuota) || 0,
    unlimited_quota: form.unlimitedQuota,
    group: form.group.trim(),
  };
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
  const platformStatus = usePlatformStore((state) => state.status);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyRecord | null>(null);
  const [form, setForm] = useState<ApiKeyFormState>(defaultFormState);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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

  function openCreateForm() {
    setEditingKey(null);
    setForm(defaultFormState);
    setFormOpen(true);
    setActionMessage(null);
    setRevealedKey(null);
  }

  function openEditForm(key: ApiKeyRecord) {
    setEditingKey(key);
    setForm({
      name: key.name,
      remainQuota: String(key.remain_quota),
      unlimitedQuota: key.unlimited_quota,
      expiredTime: String(key.expired_time),
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

    const request = toRequest(form);
    if (!request.name) {
      setActionMessage("Name is required.");
      return;
    }

    try {
      if (editingKey) {
        await apiKeysApi.updateApiKey({ id: editingKey.id, ...request });
        setActionMessage("API key updated.");
      } else {
        await apiKeysApi.createApiKey(request);
        setActionMessage("API key created. Use reveal after refresh if you need the secret.");
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

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="Create, scope, rotate, and retire credentials from a purpose-built key management page."
          title="API Keys"
        />
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
        description={actionMessage}
        onClose={() => {
          setFormOpen(false);
          setActionMessage(null);
          setRevealedKey(null);
        }}
        open={formOpen || Boolean(actionMessage) || Boolean(revealedKey)}
        title={formOpen ? (editingKey ? "Edit key" : "Create key") : "Key action"}
      >
          {revealedKey && (
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] p-4 font-mono text-xs text-[#242121]">
              {revealedKey}
            </div>
          )}

          {formOpen && (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Name
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                  required
                  value={form.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Group
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, group: event.target.value }))
                  }
                  placeholder="Default backend group"
                  value={form.group}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Quota
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  disabled={form.unlimitedQuota}
                  min={0}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, remainQuota: event.target.value }))
                  }
                  type="number"
                  value={form.remainQuota}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Expired time
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, expiredTime: event.target.value }))
                  }
                  type="number"
                  value={form.expiredTime}
                />
              </label>
              <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
                <input
                  checked={form.unlimitedQuota}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, unlimitedQuota: event.target.checked }))
                  }
                  type="checkbox"
                />
                Unlimited quota
              </label>
              <Button className="justify-self-start md:col-span-2" type="submit">
                {editingKey ? "Save key" : "Create key"}
              </Button>
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
          description="Create a scoped key for applications, scripts, or trusted internal services."
          onAction={openCreateForm}
          title="No API keys yet"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Credential inventory</h2>
              <p className="mt-2 text-sm text-[#5f5958]">
                Showing {data.items.length} of {data.total} keys.
              </p>
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
                        <p className="mt-1 text-xs font-semibold text-[#6c6a67]">
                          Group {key.group || "default"}
                        </p>
                      </div>
                    </div>
                  </ApiKeyCell>

                  <ApiKeyCell label="Key">
                    <p className="flex min-w-0 items-center gap-2 font-mono text-xs font-semibold text-[#3b3736]">
                      <KeyRound className="size-4 shrink-0 text-[#6c6a67]" />
                      <span className="truncate">{key.key}</span>
                    </p>
                    <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#10b981]">
                      <span className="size-1.5 rounded-full bg-[#10b981]" />
                      Credential
                    </p>
                  </ApiKeyCell>

                  <ApiKeyCell label="Quota">
                    <p className="font-bold text-black">
                      {key.unlimited_quota
                        ? "Unlimited"
                        : formatQuota(key.remain_quota, platformStatus)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#6c6a67]">
                      {key.unlimited_quota ? "No quota ceiling" : "Remaining quota"}
                    </p>
                  </ApiKeyCell>

                  <ApiKeyCell label="Last used">
                    <p className="font-semibold text-[#3b3736]">{formatTime(key.accessed_time)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6c6a67]">
                      Expires {formatTime(key.expired_time)}
                    </p>
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
