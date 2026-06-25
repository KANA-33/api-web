import { useState, type FormEvent } from "react";
import { BadgeCheck, BadgeX, CalendarClock, KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import * as redemptionsApi from "@features/admin/redemptions/api";
import type { AdminRedemption } from "@features/admin/redemptions/api";
import { usePlatformStore } from "@features/platform/store";
import { formatQuota } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const REDEMPTION_STATUS_ENABLED = 1;
const REDEMPTION_STATUS_DISABLED = 2;
const REDEMPTION_STATUS_USED = 3;
const pageSize = 20;

interface RedemptionFormState {
  count: string;
  expiredDate: string;
  name: string;
  quota: string;
}

const defaultForm: RedemptionFormState = {
  count: "1",
  expiredDate: "",
  name: "",
  quota: "100",
};

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function dateInputToTimestamp(value: string) {
  if (!value) {
    return 0;
  }

  const date = new Date(`${value}T23:59:59`);
  return Math.floor(date.getTime() / 1000);
}

function timestampToDateInput(timestamp?: number) {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function getStatusLabel(status: number) {
  if (status === REDEMPTION_STATUS_ENABLED) {
    return "Enabled";
  }

  if (status === REDEMPTION_STATUS_USED) {
    return "Used";
  }

  return "Disabled";
}

function getStatusIcon(status: number) {
  if (status === REDEMPTION_STATUS_ENABLED) {
    return <BadgeCheck className="size-4 text-[#63785f]" />;
  }

  if (status === REDEMPTION_STATUS_USED) {
    return <CalendarClock className="size-4 text-[#8b765e]" />;
  }

  return <BadgeX className="size-4 text-[#8a4d3d]" />;
}

function toForm(redemption: AdminRedemption): RedemptionFormState {
  return {
    count: "1",
    expiredDate: timestampToDateInput(redemption.expired_time),
    name: redemption.name,
    quota: String(redemption.quota),
  };
}

export function AdminRedemptionsPage() {
  const platformStatus = usePlatformStore((state) => state.status);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingRedemption, setEditingRedemption] = useState<AdminRedemption | null>(null);
  const [form, setForm] = useState<RedemptionFormState>(defaultForm);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const query = {
      keyword: appliedKeyword || undefined,
      p: page,
      page_size: pageSize,
    };
    const response = appliedKeyword
      ? await redemptionsApi.searchRedemptions(query)
      : await redemptionsApi.listRedemptions(query);
    return response.data;
  }, [page, appliedKeyword]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  function openCreateForm() {
    setForm(defaultForm);
    setFormMode("create");
    setEditingRedemption(null);
    setGeneratedKeys([]);
    setActionMessage(null);
  }

  function openEditForm(redemption: AdminRedemption) {
    setForm(toForm(redemption));
    setFormMode("edit");
    setEditingRedemption(redemption);
    setGeneratedKeys([]);
    setActionMessage(null);
  }

  function closePanel() {
    setFormMode(null);
    setEditingRedemption(null);
    setActionMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setGeneratedKeys([]);

    const name = form.name.trim();
    const quota = Number(form.quota);
    const count = Math.min(Math.max(Number(form.count), 1), 100);

    if (!name) {
      setActionMessage("Redemption name is required.");
      return;
    }

    if (!Number.isFinite(quota) || quota <= 0) {
      setActionMessage("Quota must be greater than 0.");
      return;
    }

    try {
      if (formMode === "create") {
        const response = await redemptionsApi.createRedemption({
          count,
          expired_time: dateInputToTimestamp(form.expiredDate),
          name,
          quota,
        });
        setGeneratedKeys(response.data ?? []);
        setActionMessage(`Created ${response.data?.length ?? count} redemption code(s).`);
      } else if (editingRedemption) {
        await redemptionsApi.updateRedemption({
          expired_time: dateInputToTimestamp(form.expiredDate),
          id: editingRedemption.id,
          name,
          quota,
        });
        setFormMode(null);
        setEditingRedemption(null);
        setActionMessage("Redemption code updated.");
      }

      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Redemption action failed");
    }
  }

  async function handleStatus(redemption: AdminRedemption) {
    if (redemption.status === REDEMPTION_STATUS_USED) {
      return;
    }

    setActionMessage(null);

    try {
      await redemptionsApi.updateRedemptionStatus(
        redemption.id,
        redemption.status === REDEMPTION_STATUS_ENABLED
          ? REDEMPTION_STATUS_DISABLED
          : REDEMPTION_STATUS_ENABLED,
      );
      setActionMessage("Redemption status updated.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Status update failed");
    }
  }

  async function handleDelete(redemption: AdminRedemption) {
    if (!window.confirm(`Delete redemption code "${redemption.name}"?`)) {
      return;
    }

    setActionMessage(null);

    try {
      await redemptionsApi.deleteRedemption(redemption.id);
      setActionMessage("Redemption code deleted.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Delete failed");
    }
  }

  async function handleDeleteInvalid() {
    if (!window.confirm("Delete all used, disabled, and expired redemption codes?")) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await redemptionsApi.deleteInvalidRedemptions();
      setActionMessage(`Deleted ${response.data ?? 0} invalid redemption code(s).`);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Invalid cleanup failed");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle
          description="Issue, search, disable, and clean redemption codes without exposing unrelated billing configuration."
          title="Redemptions"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 size-4" />
            Generate
          </Button>
          <Button onClick={() => void handleDeleteInvalid()} variant="secondary">
            <Trash2 className="mr-2 size-4" />
            Clean invalid
          </Button>
        </div>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={applyFilters}>
          <input
            className="h-11 flex-1 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by name prefix or exact id"
            value={keyword}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {(formMode || generatedKeys.length > 0 || actionMessage) && (
        <Card className="border-[#c9baa4]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {formMode === "edit" ? "Edit redemption" : "Redemption action"}
              </h2>
              <p className="mt-2 text-sm text-[#655b50]">
                Quota values are submitted as raw backend quota units.
              </p>
            </div>
            {formMode && (
              <button
                aria-label="Close redemption panel"
                className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                onClick={closePanel}
                type="button"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {actionMessage && (
            <p className="mt-4 text-sm font-medium text-[#5d4f41]">{actionMessage}</p>
          )}

          {generatedKeys.length > 0 && (
            <div className="mt-4 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4" />
                Generated keys
              </div>
              <div className="max-h-56 overflow-auto font-mono text-xs leading-6 text-[#3d3833]">
                {generatedKeys.map((key) => (
                  <div key={key}>{key}</div>
                ))}
              </div>
            </div>
          )}

          {formMode && (
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Name
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  maxLength={20}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                  required
                  value={form.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Raw quota
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  min={1}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, quota: event.target.value }))
                  }
                  required
                  type="number"
                  value={form.quota}
                />
              </label>
              {formMode === "create" && (
                <label className="grid gap-2 text-sm font-medium">
                  Count
                  <input
                    className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                    max={100}
                    min={1}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, count: event.target.value }))
                    }
                    required
                    type="number"
                    value={form.count}
                  />
                </label>
              )}
              <label className="grid gap-2 text-sm font-medium">
                Expiration date
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, expiredDate: event.target.value }))
                  }
                  type="date"
                  value={form.expiredDate}
                />
              </label>
              <Button className="justify-self-start md:col-span-2" type="submit">
                {formMode === "create" ? "Generate codes" : "Save redemption"}
              </Button>
            </form>
          )}
        </Card>
      )}

      {loading && <LoadingBlock title="Loading redemption codes" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Redemptions unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock
          actionLabel="Generate codes"
          description="No redemption codes match the current filters."
          onAction={openCreateForm}
          title="No redemption codes found"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div>
            <h2 className="text-xl font-semibold">Redemption inventory</h2>
            <p className="mt-2 text-sm text-[#655b50]">
              Showing {data.items.length} of {data.total} redemption codes.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Code</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Quota</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Issued</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Expiration</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Redeemed</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((redemption) => (
                  <tr key={redemption.id}>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="font-medium text-[#2d2926]">{redemption.name}</div>
                      <div className="mt-1 max-w-72 truncate font-mono text-xs text-[#7c6e5e]">
                        #{redemption.id} · {redemption.key}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {getStatusIcon(redemption.status)}
                        {getStatusLabel(redemption.status)}
                      </span>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatQuota(redemption.quota, platformStatus)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatTime(redemption.created_time)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatTime(redemption.expired_time)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>{formatTime(redemption.redeemed_time)}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        User {redemption.used_user_id || "None"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          aria-label="Edit redemption"
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => openEditForm(redemption)}
                          type="button"
                        >
                          <Pencil className="size-4" />
                        </button>
                        {redemption.status !== REDEMPTION_STATUS_USED && (
                          <button
                            aria-label={
                              redemption.status === REDEMPTION_STATUS_ENABLED
                                ? "Disable redemption"
                                : "Enable redemption"
                            }
                            className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleStatus(redemption)}
                            type="button"
                          >
                            {redemption.status === REDEMPTION_STATUS_ENABLED ? (
                              <BadgeX className="size-4" />
                            ) : (
                              <BadgeCheck className="size-4" />
                            )}
                          </button>
                        )}
                        <button
                          aria-label="Delete redemption"
                          className="rounded-md p-2 text-[#7a4a3b] hover:bg-[#f0dfd2]"
                          onClick={() => void handleDelete(redemption)}
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
