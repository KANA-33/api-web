import { useState, type FormEvent } from "react";
import { Eye, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import * as apiKeysApi from "@features/api-keys/api";
import { usePlatformStore } from "@features/platform/store";
import type { ApiKeyRecord } from "@shared/api/contracts";
import { formatQuota } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
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

      {(formOpen || actionMessage || revealedKey) && (
        <Card className="border-[#d4cece]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {formOpen ? (editingKey ? "Edit key" : "Create key") : "Key action"}
              </h2>
              {actionMessage && (
                <p className="mt-2 text-sm leading-6 text-[#5f5958]">{actionMessage}</p>
              )}
            </div>
            <button
              aria-label="Close"
              className="rounded-[2px] p-2 text-[#5f5958] hover:bg-[#efeded]"
              onClick={() => {
                setFormOpen(false);
                setActionMessage(null);
                setRevealedKey(null);
              }}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {revealedKey && (
            <div className="mt-5 rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] p-4 font-mono text-xs text-[#242121]">
              {revealedKey}
            </div>
          )}

          {formOpen && (
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
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
        </Card>
      )}

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
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#6c6a67]">
                <tr>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Name</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Key</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Quota</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Last used</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Status</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((key) => (
                  <tr key={key.id}>
                    <td className="border-b border-[#efeded] py-4 pr-4 font-medium">{key.name}</td>
                    <td className="border-b border-[#efeded] py-4 pr-4 font-mono text-xs text-[#5f5958]">
                      {key.key}
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      {key.unlimited_quota
                        ? "Unlimited"
                        : formatQuota(key.remain_quota, platformStatus)}
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      {formatTime(key.accessed_time)}
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      {key.status === 1 ? "Active" : "Inactive"}
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div className="flex gap-1">
                        <button
                          aria-label="Reveal key"
                          className="rounded-[2px] p-2 text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleReveal(key.id)}
                          type="button"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          aria-label="Edit key"
                          className="rounded-[2px] p-2 text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => openEditForm(key)}
                          type="button"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          aria-label="Delete key"
                          className="rounded-[2px] p-2 text-[#7f1d1d] hover:bg-[#efeded]"
                          onClick={() => void handleDelete(key)}
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
