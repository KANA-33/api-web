import { useState, type FormEvent } from "react";
import {
  BadgeCheck,
  BadgeX,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import * as modelsApi from "@features/admin/models/api";
import type { AdminModel, AdminVendor } from "@features/admin/models/api";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const MODEL_STATUS_ENABLED = 1;
const MODEL_STATUS_DISABLED = 2;
const SYNC_OFFICIAL_ENABLED = 1;
const pageSize = 20;

const nameRuleOptions = [
  { label: "Exact", value: 0 },
  { label: "Prefix", value: 1 },
  { label: "Contains", value: 2 },
  { label: "Suffix", value: 3 },
];

interface ModelFormState {
  description: string;
  endpoints: string;
  icon: string;
  modelName: string;
  nameRule: string;
  status: string;
  syncOfficial: string;
  tags: string;
  vendorId: string;
}

const defaultForm: ModelFormState = {
  description: "",
  endpoints: "",
  icon: "",
  modelName: "",
  nameRule: "0",
  status: String(MODEL_STATUS_ENABLED),
  syncOfficial: String(SYNC_OFFICIAL_ENABLED),
  tags: "",
  vendorId: "",
};

function getVendorName(vendors: AdminVendor[], vendorId?: number) {
  if (!vendorId) {
    return "Unassigned";
  }

  return vendors.find((vendor) => vendor.id === vendorId)?.name ?? `Vendor #${vendorId}`;
}

function getNameRuleLabel(rule: number) {
  return nameRuleOptions.find((item) => item.value === rule)?.label ?? "Exact";
}

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleDateString();
}

function toForm(model: AdminModel): ModelFormState {
  return {
    description: model.description ?? "",
    endpoints: model.endpoints ?? "",
    icon: model.icon ?? "",
    modelName: model.model_name,
    nameRule: String(model.name_rule ?? 0),
    status: String(model.status ?? MODEL_STATUS_ENABLED),
    syncOfficial: String(model.sync_official ?? SYNC_OFFICIAL_ENABLED),
    tags: model.tags ?? "",
    vendorId: model.vendor_id ? String(model.vendor_id) : "",
  };
}

function toPayload(form: ModelFormState, existing?: AdminModel): Partial<AdminModel> {
  return {
    ...existing,
    description: form.description.trim(),
    endpoints: form.endpoints.trim(),
    icon: form.icon.trim(),
    model_name: form.modelName.trim(),
    name_rule: Number(form.nameRule),
    status: Number(form.status),
    sync_official: Number(form.syncOfficial),
    tags: form.tags.trim(),
    vendor_id: form.vendorId ? Number(form.vendorId) : 0,
  };
}

export function AdminModelsPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [vendor, setVendor] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ keyword: "", vendor: "" });
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingModel, setEditingModel] = useState<AdminModel | null>(null);
  const [form, setForm] = useState<ModelFormState>(defaultForm);
  const [missingOpen, setMissingOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const query = {
      p: page,
      page_size: pageSize,
      keyword: appliedFilters.keyword || undefined,
      vendor: appliedFilters.vendor || undefined,
    };
    const response =
      appliedFilters.keyword || appliedFilters.vendor
        ? await modelsApi.searchModels(query)
        : await modelsApi.listModels(query);
    return response.data;
  }, [page, appliedFilters]);

  const {
    data: vendors,
    error: vendorsError,
    loading: vendorsLoading,
    reload: reloadVendors,
  } = useAsyncData(async () => {
    const response = await modelsApi.listVendors({ p: 1, page_size: 1000 });
    return response.data.items;
  }, []);

  const {
    data: missingModels,
    error: missingError,
    loading: missingLoading,
    reload: reloadMissing,
  } = useAsyncData(async () => {
    const response = await modelsApi.getMissingModels();
    return response.data;
  }, []);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      keyword: keyword.trim(),
      vendor,
    });
  }

  function openCreateForm(modelName = "") {
    setForm({ ...defaultForm, modelName });
    setFormMode("create");
    setEditingModel(null);
    setActionMessage(null);
  }

  function openEditForm(model: AdminModel) {
    setForm(toForm(model));
    setEditingModel(model);
    setFormMode("edit");
    setActionMessage(null);
  }

  function closePanel() {
    setFormMode(null);
    setEditingModel(null);
    setActionMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    if (!form.modelName.trim()) {
      setActionMessage("Model name is required.");
      return;
    }

    try {
      if (formMode === "create") {
        await modelsApi.createModel(toPayload(form));
        setActionMessage("Model created.");
      } else if (editingModel) {
        await modelsApi.updateModel({
          ...toPayload(form, editingModel),
          id: editingModel.id,
        });
        setActionMessage("Model updated.");
      }

      setFormMode(null);
      setEditingModel(null);
      await Promise.all([reload(), reloadMissing()]);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Model action failed");
    }
  }

  async function handleStatus(model: AdminModel) {
    const nextStatus =
      model.status === MODEL_STATUS_ENABLED ? MODEL_STATUS_DISABLED : MODEL_STATUS_ENABLED;
    const result = await confirmSensitive({
      actionLabel: nextStatus === MODEL_STATUS_ENABLED ? "Enable model" : "Disable model",
      description:
        nextStatus === MODEL_STATUS_ENABLED
          ? `This makes "${model.model_name}" available according to backend routing rules.`
          : `This hides "${model.model_name}" from model availability and routing metadata.`,
      intent: nextStatus === MODEL_STATUS_ENABLED ? "warning" : "danger",
      reasonLabel: "Reason for audit context",
      title: nextStatus === MODEL_STATUS_ENABLED ? "Enable model" : "Disable model",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await modelsApi.updateModelStatus(model.id, nextStatus);
      setActionMessage("Model status updated.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Status update failed");
    }
  }

  async function handleDelete(model: AdminModel) {
    const result = await confirmSensitive({
      actionLabel: "Delete model",
      confirmText: model.model_name,
      description: `This removes model metadata for "${model.model_name}". It can affect model discovery and matching behavior.`,
      reasonLabel: "Reason for audit context",
      title: "Delete model",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await modelsApi.deleteModel(model.id);
      setActionMessage("Model deleted.");
      await Promise.all([reload(), reloadMissing()]);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Delete failed");
    }
  }

  const vendorItems = vendors ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="Maintain model metadata, vendor ownership, matching rules, and channel binding visibility."
          title="Models"
        />
        <div className="flex gap-2">
          <Button
            className="gap-2"
            onClick={() => {
              void reload();
              void reloadVendors();
              void reloadMissing();
            }}
            variant="secondary"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => openCreateForm()}>
            <Plus className="size-4" />
            Add model
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.42fr]">
        <Card>
          <form className="grid gap-3 md:grid-cols-[1fr_0.7fr_auto]" onSubmit={applyFilters}>
            <input
              className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search model name, description, or tags"
              value={keyword}
            />
            <select
              className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
              disabled={vendorsLoading}
              onChange={(event) => setVendor(event.target.value)}
              value={vendor}
            >
              <option value="">Any vendor</option>
              {vendorItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          {vendorsError && <p className="mt-3 text-sm text-[#8a4d3d]">{vendorsError}</p>}
        </Card>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#837462]">Missing models</p>
            <strong className="mt-1 block text-2xl font-semibold">
              {missingLoading ? "..." : (missingModels?.length ?? 0)}
            </strong>
          </div>
          <Button
            className="gap-2"
            onClick={() => setMissingOpen((value) => !value)}
            variant="secondary"
          >
            <ClipboardList className="size-4" />
            Review
          </Button>
        </Card>
      </div>

      {missingOpen && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Missing model references</h2>
              <p className="mt-2 text-sm leading-6 text-[#655b50]">
                Models referenced by channels but not yet configured in metadata.
              </p>
            </div>
            <Button onClick={() => void reloadMissing()} variant="secondary">
              Refresh
            </Button>
          </div>
          {missingError && <p className="mt-4 text-sm text-[#8a4d3d]">{missingError}</p>}
          {!missingError && (
            <div className="mt-5 flex flex-wrap gap-2">
              {(missingModels ?? []).length === 0 ? (
                <span className="text-sm text-[#655b50]">No missing models detected.</span>
              ) : (
                (missingModels ?? []).map((item) => (
                  <button
                    className="rounded-md border border-[#d8cbb8] bg-[#f7f0e8] px-3 py-2 font-mono text-xs text-[#4b4640] hover:bg-[#eadfce]"
                    key={item}
                    onClick={() => openCreateForm(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))
              )}
            </div>
          )}
        </Card>
      )}

      {(formMode || actionMessage) && (
        <Card className="border-[#c9baa4]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {formMode === "create"
                  ? "Add model"
                  : formMode === "edit"
                    ? `Edit ${editingModel?.model_name}`
                    : "Model action"}
              </h2>
              {actionMessage && (
                <p className="mt-2 text-sm leading-6 text-[#655b50]">{actionMessage}</p>
              )}
            </div>
            <button
              aria-label="Close"
              className="rounded-md p-2 text-[#6d6256] hover:bg-[#eadfce]"
              onClick={closePanel}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {formMode && (
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Model name
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 font-mono text-sm outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, modelName: event.target.value }))
                  }
                  required
                  value={form.modelName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Vendor
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, vendorId: event.target.value }))
                  }
                  value={form.vendorId}
                >
                  <option value="">Unassigned</option>
                  {vendorItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Icon
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) => setForm((value) => ({ ...value, icon: event.target.value }))}
                  placeholder="Icon key"
                  value={form.icon}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tags
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) => setForm((value) => ({ ...value, tags: event.target.value }))}
                  placeholder="Comma-separated tags"
                  value={form.tags}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Name rule
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, nameRule: event.target.value }))
                  }
                  value={form.nameRule}
                >
                  {nameRuleOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Status
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, status: event.target.value }))
                  }
                  value={form.status}
                >
                  <option value={MODEL_STATUS_ENABLED}>Enabled</option>
                  <option value={MODEL_STATUS_DISABLED}>Disabled</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Sync official
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, syncOfficial: event.target.value }))
                  }
                  value={form.syncOfficial}
                >
                  <option value={1}>Enabled</option>
                  <option value={0}>Disabled</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Description
                <textarea
                  className="min-h-20 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 text-sm outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, description: event.target.value }))
                  }
                  value={form.description}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Endpoints
                <textarea
                  className="min-h-24 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 font-mono text-xs outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, endpoints: event.target.value }))
                  }
                  placeholder="Endpoint metadata JSON or comma-separated endpoint notes"
                  value={form.endpoints}
                />
              </label>
              <Button className="justify-self-start md:col-span-2" type="submit">
                {formMode === "create" ? "Add model" : "Save model"}
              </Button>
            </form>
          )}
        </Card>
      )}

      {loading && <LoadingBlock title="Loading models" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Models unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock
          actionLabel="Add model"
          description="No models match the current filters. Add metadata or clear the search criteria."
          onAction={() => openCreateForm()}
          title="No models found"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Model metadata</h2>
              <p className="mt-2 text-sm text-[#655b50]">
                Showing {data.items.length} of {data.total} models.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Model</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Vendor</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Rule</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Bindings</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Groups</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Updated</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((model) => (
                  <tr key={model.id}>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="font-mono text-sm font-medium text-[#2d2926]">
                        {model.model_name}
                      </div>
                      <div className="mt-1 max-w-80 truncate text-xs text-[#7c6e5e]">
                        {model.description || model.tags || "No description"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {getVendorName(vendorItems, model.vendor_id)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {getNameRuleLabel(model.name_rule)}
                      {model.matched_count ? (
                        <div className="mt-1 text-xs text-[#7c6e5e]">
                          {model.matched_count} matched
                        </div>
                      ) : null}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {model.status === MODEL_STATUS_ENABLED ? (
                          <BadgeCheck className="size-4 text-[#63785f]" />
                        ) : (
                          <BadgeX className="size-4 text-[#8a4d3d]" />
                        )}
                        {model.status === MODEL_STATUS_ENABLED ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>{model.bound_channels?.length ?? 0} channels</div>
                      <div className="mt-1 max-w-48 truncate text-xs text-[#7c6e5e]">
                        {model.bound_channels?.map((item) => item.name).join(", ") || "No bindings"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="max-w-40 truncate text-xs text-[#655b50]">
                        {model.enable_groups?.join(", ") || "None"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatTime(model.updated_time)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          aria-label="Edit model"
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => openEditForm(model)}
                          type="button"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          aria-label={
                            model.status === MODEL_STATUS_ENABLED ? "Disable model" : "Enable model"
                          }
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => void handleStatus(model)}
                          type="button"
                        >
                          {model.status === MODEL_STATUS_ENABLED ? (
                            <BadgeX className="size-4" />
                          ) : (
                            <BadgeCheck className="size-4" />
                          )}
                        </button>
                        <button
                          aria-label="Delete model"
                          className="rounded-md p-2 text-[#7a4a3b] hover:bg-[#f0dfd2]"
                          onClick={() => void handleDelete(model)}
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
