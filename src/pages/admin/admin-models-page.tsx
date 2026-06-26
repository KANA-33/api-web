import { useState, type FormEvent } from "react";
import {
  BadgeCheck,
  BadgeX,
  Building2,
  ClipboardList,
  GitCompareArrows,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
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
const VENDOR_STATUS_ENABLED = 1;
const VENDOR_STATUS_DISABLED = 2;
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

interface VendorFormState {
  description: string;
  icon: string;
  name: string;
  status: string;
}

interface PrefillFormState {
  description: string;
  items: string;
  name: string;
  type: string;
}

interface DeploymentFormState {
  payload: string;
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

const defaultVendorForm: VendorFormState = {
  description: "",
  icon: "",
  name: "",
  status: String(VENDOR_STATUS_ENABLED),
};

const defaultPrefillForm: PrefillFormState = {
  description: "",
  items: "[]",
  name: "",
  type: "model",
};

const defaultDeploymentPayload: modelsApi.DeploymentCreateRequest = {
  container_config: {
    replica_count: 1,
    traffic_port: 8000,
  },
  duration_hours: 1,
  gpus_per_container: 1,
  hardware_id: 0,
  location_ids: [],
  registry_config: {
    image_url: "",
  },
  resource_private_name: "",
};

const defaultDeploymentForm: DeploymentFormState = {
  payload: JSON.stringify(defaultDeploymentPayload, null, 2),
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

function toVendorForm(vendor: AdminVendor): VendorFormState {
  return {
    description: vendor.description ?? "",
    icon: vendor.icon ?? "",
    name: vendor.name,
    status: String(vendor.status ?? VENDOR_STATUS_ENABLED),
  };
}

function toVendorPayload(form: VendorFormState, existing?: AdminVendor): Partial<AdminVendor> {
  return {
    ...existing,
    description: form.description.trim(),
    icon: form.icon.trim(),
    name: form.name.trim(),
    status: Number(form.status),
  };
}

function toPrefillForm(group: modelsApi.PrefillGroup): PrefillFormState {
  return {
    description: group.description ?? "",
    items: JSON.stringify(group.items ?? [], null, 2),
    name: group.name,
    type: group.type,
  };
}

function parseJsonField(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  return JSON.parse(trimmed) as unknown;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

function getMatchedModelNames(model: AdminModel) {
  return model.matched_models ?? [];
}

function matchesMissingReference(model: AdminModel, missingModel: string) {
  return getMatchedModelNames(model).includes(missingModel);
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
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false);
  const [vendorPanelOpen, setVendorPanelOpen] = useState(false);
  const [officialSyncOpen, setOfficialSyncOpen] = useState(false);
  const [prefillPanelOpen, setPrefillPanelOpen] = useState(false);
  const [deploymentPanelOpen, setDeploymentPanelOpen] = useState(false);
  const [vendorFormMode, setVendorFormMode] = useState<"create" | "edit" | null>(null);
  const [editingVendor, setEditingVendor] = useState<AdminVendor | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorFormState>(defaultVendorForm);
  const [syncLocale, setSyncLocale] = useState("");
  const [selectedConflictFields, setSelectedConflictFields] = useState<Record<string, string[]>>(
    {},
  );
  const [prefillType, setPrefillType] = useState("");
  const [prefillFormMode, setPrefillFormMode] = useState<"create" | "edit" | null>(null);
  const [editingPrefill, setEditingPrefill] = useState<modelsApi.PrefillGroup | null>(null);
  const [prefillForm, setPrefillForm] = useState<PrefillFormState>(defaultPrefillForm);
  const [deploymentKeyword, setDeploymentKeyword] = useState("");
  const [deploymentStatus, setDeploymentStatus] = useState("");
  const [deploymentFormOpen, setDeploymentFormOpen] = useState(false);
  const [deploymentForm, setDeploymentForm] = useState<DeploymentFormState>(defaultDeploymentForm);
  const [selectedDeployment, setSelectedDeployment] = useState<modelsApi.DeploymentRecord | null>(
    null,
  );
  const [deploymentContainers, setDeploymentContainers] =
    useState<modelsApi.DeploymentContainersResponse | null>(null);
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

  const {
    data: upstreamSyncPreview,
    error: upstreamSyncError,
    loading: upstreamSyncLoading,
    reload: reloadUpstreamSync,
  } = useAsyncData(async () => {
    const response = await modelsApi.previewUpstreamSync(syncLocale || undefined);
    return response.data;
  }, [syncLocale]);

  const {
    data: prefillGroups,
    error: prefillError,
    loading: prefillLoading,
    reload: reloadPrefillGroups,
  } = useAsyncData(async () => {
    const response = await modelsApi.listPrefillGroups(prefillType || undefined);
    return response.data;
  }, [prefillType]);

  const {
    data: deploymentSettings,
    error: deploymentSettingsError,
    reload: reloadDeploymentSettings,
  } = useAsyncData(async () => {
    const response = await modelsApi.getDeploymentSettings();
    return response.data;
  }, []);

  const {
    data: deployments,
    error: deploymentsError,
    loading: deploymentsLoading,
    reload: reloadDeployments,
  } = useAsyncData(async () => {
    const response = await modelsApi.listDeployments({
      keyword: deploymentKeyword.trim() || undefined,
      p: 1,
      page_size: 20,
      status: deploymentStatus || undefined,
    });
    return response.data;
  }, [deploymentKeyword, deploymentStatus]);

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

  function openCreateVendorForm() {
    setVendorForm(defaultVendorForm);
    setVendorFormMode("create");
    setEditingVendor(null);
    setVendorPanelOpen(true);
    setActionMessage(null);
  }

  function openEditVendorForm(vendorItem: AdminVendor) {
    setVendorForm(toVendorForm(vendorItem));
    setVendorFormMode("edit");
    setEditingVendor(vendorItem);
    setVendorPanelOpen(true);
    setActionMessage(null);
  }

  function closeVendorForm() {
    setVendorFormMode(null);
    setEditingVendor(null);
  }

  function openCreatePrefillForm() {
    setPrefillForm(defaultPrefillForm);
    setPrefillFormMode("create");
    setEditingPrefill(null);
    setPrefillPanelOpen(true);
    setActionMessage(null);
  }

  function openEditPrefillForm(group: modelsApi.PrefillGroup) {
    setPrefillForm(toPrefillForm(group));
    setPrefillFormMode("edit");
    setEditingPrefill(group);
    setPrefillPanelOpen(true);
    setActionMessage(null);
  }

  function closePrefillForm() {
    setPrefillFormMode(null);
    setEditingPrefill(null);
  }

  function toggleConflictField(modelName: string, field: string) {
    setSelectedConflictFields((value) => {
      const current = value[modelName] ?? [];
      return {
        ...value,
        [modelName]: current.includes(field)
          ? current.filter((item) => item !== field)
          : [...current, field],
      };
    });
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

  async function handleVendorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    if (!vendorForm.name.trim()) {
      setActionMessage("Vendor name is required.");
      return;
    }

    try {
      if (vendorFormMode === "create") {
        await modelsApi.createVendor(toVendorPayload(vendorForm));
        setActionMessage("Vendor created.");
      } else if (editingVendor) {
        await modelsApi.updateVendor({
          ...toVendorPayload(vendorForm, editingVendor),
          id: editingVendor.id,
        });
        setActionMessage("Vendor updated.");
      }

      closeVendorForm();
      await Promise.all([reloadVendors(), reload()]);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Vendor action failed");
    }
  }

  async function handleVendorStatus(vendorItem: AdminVendor) {
    const nextStatus =
      vendorItem.status === VENDOR_STATUS_ENABLED ? VENDOR_STATUS_DISABLED : VENDOR_STATUS_ENABLED;
    const result = await confirmSensitive({
      actionLabel: nextStatus === VENDOR_STATUS_ENABLED ? "Enable vendor" : "Disable vendor",
      description:
        nextStatus === VENDOR_STATUS_ENABLED
          ? `This makes "${vendorItem.name}" available for model assignment.`
          : `This hides "${vendorItem.name}" from active model assignment choices.`,
      intent: nextStatus === VENDOR_STATUS_ENABLED ? "warning" : "danger",
      reasonLabel: "Reason for audit context",
      title: nextStatus === VENDOR_STATUS_ENABLED ? "Enable vendor" : "Disable vendor",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await modelsApi.updateVendorStatus(vendorItem.id, nextStatus);
      setActionMessage("Vendor status updated.");
      await Promise.all([reloadVendors(), reload()]);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Vendor status update failed");
    }
  }

  async function handleVendorDelete(vendorItem: AdminVendor) {
    const result = await confirmSensitive({
      actionLabel: "Delete vendor",
      confirmText: vendorItem.name,
      description: `This removes vendor metadata for "${vendorItem.name}". Existing models may become unassigned depending on backend rules.`,
      reasonLabel: "Reason for audit context",
      title: "Delete vendor",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await modelsApi.deleteVendor(vendorItem.id);
      setActionMessage("Vendor deleted.");
      await Promise.all([reloadVendors(), reload()]);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Vendor delete failed");
    }
  }

  async function handleUpstreamSync() {
    const overwrite = Object.entries(selectedConflictFields)
      .filter(([, fields]) => fields.length > 0)
      .map(([modelName, fields]) => ({ fields, model_name: modelName }));

    const result = await confirmSensitive({
      actionLabel: "Sync upstream models",
      description:
        "This creates missing official model metadata and overwrites only the selected conflict fields.",
      intent: "warning",
      reasonLabel: "Reason for audit context",
      title: "Sync upstream model metadata",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await modelsApi.syncUpstreamModels({
        locale: syncLocale || undefined,
        overwrite,
      });
      const skippedModels = asArray(response.data.skipped_models);
      setActionMessage(
        `Upstream sync complete. Created ${response.data.created_models}, updated ${response.data.updated_models}, skipped ${skippedModels.length}.`,
      );
      setSelectedConflictFields({});
      await Promise.all([reload(), reloadMissing(), reloadUpstreamSync(), reloadVendors()]);
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Upstream sync failed"));
    }
  }

  async function handlePrefillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    try {
      const payload = {
        description: prefillForm.description.trim(),
        items: parseJsonField(prefillForm.items),
        name: prefillForm.name.trim(),
        type: prefillForm.type.trim(),
      };

      if (!payload.name || !payload.type) {
        setActionMessage("Prefill group name and type are required.");
        return;
      }

      if (prefillFormMode === "create") {
        await modelsApi.createPrefillGroup(payload);
        setActionMessage("Prefill group created.");
      } else if (editingPrefill) {
        await modelsApi.updatePrefillGroup({ ...payload, id: editingPrefill.id });
        setActionMessage("Prefill group updated.");
      }

      closePrefillForm();
      await reloadPrefillGroups();
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Prefill group action failed"));
    }
  }

  async function handlePrefillDelete(group: modelsApi.PrefillGroup) {
    const result = await confirmSensitive({
      actionLabel: "Delete prefill group",
      confirmText: group.name,
      description: `This removes the "${group.name}" prefill group from admin selection helpers.`,
      reasonLabel: "Reason for audit context",
      title: "Delete prefill group",
    });

    if (!result.confirmed) {
      return;
    }

    try {
      await modelsApi.deletePrefillGroup(group.id);
      setActionMessage("Prefill group deleted.");
      await reloadPrefillGroups();
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Prefill group delete failed"));
    }
  }

  async function handleDeploymentCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    try {
      const payload = JSON.parse(deploymentForm.payload) as modelsApi.DeploymentCreateRequest;
      const response = await modelsApi.createDeployment(payload);
      setActionMessage(`Deployment create requested: ${response.data.deployment_id}`);
      setDeploymentFormOpen(false);
      await reloadDeployments();
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Deployment create failed"));
    }
  }

  async function handleDeploymentRename(deployment: modelsApi.DeploymentRecord) {
    const nextName = window.prompt("New deployment name", deployment.deployment_name);
    if (!nextName?.trim()) {
      return;
    }

    try {
      await modelsApi.updateDeploymentName(deployment.id, nextName.trim());
      setActionMessage("Deployment rename requested.");
      await reloadDeployments();
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Deployment rename failed"));
    }
  }

  async function handleDeploymentExtend(deployment: modelsApi.DeploymentRecord) {
    const rawHours = window.prompt("Extend duration in hours", "1");
    const durationHours = Number(rawHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Extend deployment",
      description: `This extends "${deployment.deployment_name}" by ${durationHours} hour(s). Provider charges may apply.`,
      intent: "warning",
      reasonLabel: "Reason for audit context",
      title: "Extend deployment",
    });

    if (!result.confirmed) {
      return;
    }

    try {
      await modelsApi.extendDeployment(deployment.id, durationHours);
      setActionMessage("Deployment extension requested.");
      await reloadDeployments();
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Deployment extend failed"));
    }
  }

  async function handleDeploymentDelete(deployment: modelsApi.DeploymentRecord) {
    const result = await confirmSensitive({
      actionLabel: "Terminate deployment",
      confirmText: deployment.deployment_name,
      description: `This requests termination for "${deployment.deployment_name}".`,
      reasonLabel: "Reason for audit context",
      title: "Terminate deployment",
    });

    if (!result.confirmed) {
      return;
    }

    try {
      await modelsApi.deleteDeployment(deployment.id);
      setActionMessage("Deployment termination requested.");
      await reloadDeployments();
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Deployment delete failed"));
    }
  }

  async function handleDeploymentContainers(deployment: modelsApi.DeploymentRecord) {
    setSelectedDeployment(deployment);
    setDeploymentContainers(null);

    try {
      const response = await modelsApi.listDeploymentContainers(deployment.id);
      setDeploymentContainers(response.data);
    } catch (caught) {
      setActionMessage(getErrorMessage(caught, "Failed to load deployment containers"));
    }
  }

  const vendorItems = vendors ?? [];
  const syncPreviewItems =
    data?.items.filter(
      (model) => (model.matched_count ?? 0) > 0 || (model.matched_models?.length ?? 0) > 0,
    ) ?? [];
  const conflictRows = (missingModels ?? []).map((missingModel) => ({
    coveringModels: syncPreviewItems.filter((model) =>
      matchesMissingReference(model, missingModel),
    ),
    modelName: missingModel,
  }));
  const uncoveredMissingModels = conflictRows.filter((item) => item.coveringModels.length === 0);
  const coveredMissingModels = conflictRows.filter((item) => item.coveringModels.length > 0);
  const officialMissingModels = asArray(upstreamSyncPreview?.missing);
  const officialSyncConflicts = asArray(upstreamSyncPreview?.conflicts);
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
          <Button
            className="gap-2"
            onClick={() => setSyncPreviewOpen((value) => !value)}
            variant="secondary"
          >
            <GitCompareArrows className="size-4" />
            Sync preview
          </Button>
          <Button
            className="gap-2"
            onClick={() => setOfficialSyncOpen((value) => !value)}
            variant="secondary"
          >
            <RefreshCw className="size-4" />
            Official sync
          </Button>
          <Button
            className="gap-2"
            onClick={() => setVendorPanelOpen((value) => !value)}
            variant="secondary"
          >
            <Building2 className="size-4" />
            Vendors
          </Button>
          <Button
            className="gap-2"
            onClick={() => setPrefillPanelOpen((value) => !value)}
            variant="secondary"
          >
            <Layers3 className="size-4" />
            Prefills
          </Button>
          <Button
            className="gap-2"
            onClick={() => setDeploymentPanelOpen((value) => !value)}
            variant="secondary"
          >
            <Rocket className="size-4" />
            Deployments
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

      {syncPreviewOpen && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Model sync preview</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#655b50]">
                Review backend-reported missing models and current matching metadata before creating
                exact records or editing a covering match rule.
              </p>
            </div>
            <Button
              onClick={() => {
                void reload();
                void reloadMissing();
              }}
              variant="secondary"
            >
              Refresh preview
            </Button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-md border border-[#ddcfbd] bg-[#f8f1e7] p-4">
              <p className="text-sm font-semibold text-[#2d2926]">Conflict triage</p>
              <p className="mt-1 text-xs leading-5 text-[#7c6e5e]">
                Missing channel references are split by whether an existing matching rule already
                covers them on the current page.
              </p>
              <div className="mt-4 max-h-80 space-y-5 overflow-auto">
                {conflictRows.length === 0 ? (
                  <span className="text-sm text-[#655b50]">No missing models detected.</span>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d7a63]">
                          Uncovered
                        </p>
                        <span className="text-xs text-[#7c6e5e]">
                          {uncoveredMissingModels.length}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {uncoveredMissingModels.length === 0 ? (
                          <p className="text-xs text-[#655b50]">
                            All missing references are covered by a current matching rule.
                          </p>
                        ) : (
                          uncoveredMissingModels.map((item) => (
                            <div
                              className="rounded-md border border-[#e1d3c0] bg-[#fffaf3] p-3"
                              key={item.modelName}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="font-mono text-xs font-medium text-[#2d2926]">
                                  {item.modelName}
                                </p>
                                <button
                                  className="rounded-md px-2 py-1 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                                  onClick={() => openCreateForm(item.modelName)}
                                  type="button"
                                >
                                  Create exact
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d7a63]">
                          Covered by rule
                        </p>
                        <span className="text-xs text-[#7c6e5e]">
                          {coveredMissingModels.length}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {coveredMissingModels.length === 0 ? (
                          <p className="text-xs text-[#655b50]">
                            No missing reference is covered by the current page matching rules.
                          </p>
                        ) : (
                          coveredMissingModels.map((item) => (
                            <div
                              className="rounded-md border border-[#e1d3c0] bg-[#fffaf3] p-3"
                              key={item.modelName}
                            >
                              <p className="font-mono text-xs font-medium text-[#2d2926]">
                                {item.modelName}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.coveringModels.map((model) => (
                                  <button
                                    className="rounded-md bg-[#eadfce] px-2 py-1 text-xs text-[#4b4640] hover:bg-[#e0d2bd]"
                                    key={model.id}
                                    onClick={() => openEditForm(model)}
                                    type="button"
                                  >
                                    Edit {model.model_name}
                                  </button>
                                ))}
                                <button
                                  className="rounded-md px-2 py-1 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                                  onClick={() => openCreateForm(item.modelName)}
                                  type="button"
                                >
                                  Create exact override
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-md border border-[#ddcfbd] bg-[#f8f1e7] p-4">
              <p className="text-sm font-semibold text-[#2d2926]">Matching preview</p>
              <p className="mt-1 text-xs leading-5 text-[#7c6e5e]">
                Current page models whose rule matches upstream or channel model names.
              </p>
              <div className="mt-4 max-h-64 space-y-3 overflow-auto">
                {syncPreviewItems.length === 0 ? (
                  <span className="text-sm text-[#655b50]">
                    No matching metadata reported on this page.
                  </span>
                ) : (
                  syncPreviewItems.map((model) => (
                    <div
                      className="rounded-md border border-[#e1d3c0] bg-[#fffaf3] p-3"
                      key={model.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-mono text-sm font-medium text-[#2d2926]">
                          {model.model_name}
                        </p>
                        <span className="text-xs text-[#7c6e5e]">
                          {model.matched_count ?? model.matched_models?.length ?? 0} matched
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(model.matched_models ?? []).slice(0, 16).map((item) => (
                          <span
                            className="rounded-md bg-[#eadfce] px-2 py-1 font-mono text-xs"
                            key={item}
                          >
                            {item}
                          </span>
                        ))}
                        {(model.matched_models?.length ?? 0) > 16 && (
                          <span className="text-xs text-[#7c6e5e]">
                            +{(model.matched_models?.length ?? 0) - 16} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {officialSyncOpen && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Official upstream sync</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#655b50]">
                Pull official metadata, create missing models, and overwrite only the conflict
                fields selected below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                onChange={(event) => setSyncLocale(event.target.value)}
                value={syncLocale}
              >
                <option value="">Default locale</option>
                <option value="en">English</option>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
                <option value="ja">日本語</option>
              </select>
              <Button onClick={() => void reloadUpstreamSync()} variant="secondary">
                Preview
              </Button>
              <Button onClick={() => void handleUpstreamSync()}>Apply selected</Button>
            </div>
          </div>

          {upstreamSyncError && <p className="mt-4 text-sm text-[#8a4d3d]">{upstreamSyncError}</p>}
          {upstreamSyncLoading && <p className="mt-4 text-sm text-[#655b50]">Loading preview...</p>}

          {upstreamSyncPreview && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[0.42fr_0.58fr]">
              <div className="rounded-md border border-[#ddcfbd] bg-[#f8f1e7] p-4">
                <p className="text-sm font-semibold text-[#2d2926]">Missing official models</p>
                <p className="mt-1 text-xs text-[#7c6e5e]">
                  {officialMissingModels.length} model(s) can be created during apply.
                </p>
                <div className="mt-4 flex max-h-52 flex-wrap gap-2 overflow-auto">
                  {officialMissingModels.length === 0 ? (
                    <span className="text-sm text-[#655b50]">No official missing models.</span>
                  ) : (
                    officialMissingModels.map((item) => (
                      <span
                        className="rounded-md bg-[#fffaf3] px-2 py-1 font-mono text-xs"
                        key={item}
                      >
                        {item}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-md border border-[#ddcfbd] bg-[#f8f1e7] p-4">
                <p className="text-sm font-semibold text-[#2d2926]">Overwrite conflicts</p>
                <p className="mt-1 text-xs text-[#7c6e5e]">
                  Select exactly which fields should be overwritten by official metadata.
                </p>
                <div className="mt-4 max-h-72 space-y-3 overflow-auto">
                  {officialSyncConflicts.length === 0 ? (
                    <span className="text-sm text-[#655b50]">No conflicts found.</span>
                  ) : (
                    officialSyncConflicts.map((conflict) => (
                      <div
                        className="rounded-md border border-[#e1d3c0] bg-[#fffaf3] p-3"
                        key={conflict.model_name}
                      >
                        <p className="font-mono text-sm font-medium text-[#2d2926]">
                          {conflict.model_name}
                        </p>
                        <div className="mt-3 space-y-2">
                          {asArray(conflict.fields).map((field) => (
                            <label
                              className="grid gap-1 rounded-md bg-[#f8f1e7] p-2 text-xs"
                              key={field.field}
                            >
                              <span className="flex items-center gap-2 font-semibold text-[#4b4640]">
                                <input
                                  checked={
                                    selectedConflictFields[conflict.model_name]?.includes(
                                      field.field,
                                    ) ?? false
                                  }
                                  className="size-4 accent-[#2f3533]"
                                  onChange={() =>
                                    toggleConflictField(conflict.model_name, field.field)
                                  }
                                  type="checkbox"
                                />
                                {field.field}
                              </span>
                              <span className="text-[#7c6e5e]">
                                Local: {String(field.local ?? "")}
                              </span>
                              <span className="text-[#7c6e5e]">
                                Upstream: {String(field.upstream ?? "")}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {vendorPanelOpen && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Vendors</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655b50]">
                Manage provider metadata used by model assignment and filtering.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void reloadVendors()} variant="secondary">
                Refresh vendors
              </Button>
              <Button className="gap-2" onClick={openCreateVendorForm}>
                <Plus className="size-4" />
                Add vendor
              </Button>
            </div>
          </div>

          {vendorFormMode && (
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleVendorSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Vendor name
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setVendorForm((value) => ({ ...value, name: event.target.value }))
                  }
                  required
                  value={vendorForm.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Status
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setVendorForm((value) => ({ ...value, status: event.target.value }))
                  }
                  value={vendorForm.status}
                >
                  <option value={VENDOR_STATUS_ENABLED}>Enabled</option>
                  <option value={VENDOR_STATUS_DISABLED}>Disabled</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Icon
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setVendorForm((value) => ({ ...value, icon: event.target.value }))
                  }
                  placeholder="Icon key"
                  value={vendorForm.icon}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Description
                <textarea
                  className="min-h-20 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 text-sm outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setVendorForm((value) => ({ ...value, description: event.target.value }))
                  }
                  value={vendorForm.description}
                />
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit">
                  {vendorFormMode === "create" ? "Add vendor" : "Save vendor"}
                </Button>
                <Button onClick={closeVendorForm} type="button" variant="secondary">
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Vendor</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Updated</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorItems.length === 0 ? (
                  <tr>
                    <td className="border-b border-[#eadfce] py-4 pr-4 text-[#655b50]" colSpan={4}>
                      No vendors loaded.
                    </td>
                  </tr>
                ) : (
                  vendorItems.map((vendorItem) => (
                    <tr key={vendorItem.id}>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div className="font-medium text-[#2d2926]">{vendorItem.name}</div>
                        <div className="mt-1 max-w-96 truncate text-xs text-[#7c6e5e]">
                          {vendorItem.description || vendorItem.icon || "No description"}
                        </div>
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          {vendorItem.status === VENDOR_STATUS_ENABLED ? (
                            <BadgeCheck className="size-4 text-[#63785f]" />
                          ) : (
                            <BadgeX className="size-4 text-[#8a4d3d]" />
                          )}
                          {vendorItem.status === VENDOR_STATUS_ENABLED ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        {formatTime(vendorItem.updated_time)}
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div className="flex flex-wrap gap-1">
                          <button
                            aria-label="Edit vendor"
                            className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => openEditVendorForm(vendorItem)}
                            type="button"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            aria-label={
                              vendorItem.status === VENDOR_STATUS_ENABLED
                                ? "Disable vendor"
                                : "Enable vendor"
                            }
                            className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleVendorStatus(vendorItem)}
                            type="button"
                          >
                            {vendorItem.status === VENDOR_STATUS_ENABLED ? (
                              <BadgeX className="size-4" />
                            ) : (
                              <BadgeCheck className="size-4" />
                            )}
                          </button>
                          <button
                            aria-label="Delete vendor"
                            className="rounded-md p-2 text-[#7a4a3b] hover:bg-[#f0dfd2]"
                            onClick={() => void handleVendorDelete(vendorItem)}
                            type="button"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {prefillPanelOpen && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Prefill groups</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655b50]">
                Manage reusable model, tag, and endpoint presets used by admin metadata workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                onChange={(event) => setPrefillType(event.target.value)}
                value={prefillType}
              >
                <option value="">Any type</option>
                <option value="model">Model</option>
                <option value="tag">Tag</option>
                <option value="endpoint">Endpoint</option>
              </select>
              <Button onClick={() => void reloadPrefillGroups()} variant="secondary">
                Refresh
              </Button>
              <Button className="gap-2" onClick={openCreatePrefillForm}>
                <Plus className="size-4" />
                Add prefill
              </Button>
            </div>
          </div>

          {prefillError && <p className="mt-4 text-sm text-[#8a4d3d]">{prefillError}</p>}
          {prefillLoading && <p className="mt-4 text-sm text-[#655b50]">Loading prefills...</p>}

          {prefillFormMode && (
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handlePrefillSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Name
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setPrefillForm((value) => ({ ...value, name: event.target.value }))
                  }
                  required
                  value={prefillForm.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Type
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setPrefillForm((value) => ({ ...value, type: event.target.value }))
                  }
                  required
                  value={prefillForm.type}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Description
                <textarea
                  className="min-h-20 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 text-sm outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setPrefillForm((value) => ({ ...value, description: event.target.value }))
                  }
                  value={prefillForm.description}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Items JSON
                <textarea
                  className="min-h-32 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 font-mono text-xs outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setPrefillForm((value) => ({ ...value, items: event.target.value }))
                  }
                  value={prefillForm.items}
                />
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit">
                  {prefillFormMode === "create" ? "Add prefill" : "Save prefill"}
                </Button>
                <Button onClick={closePrefillForm} type="button" variant="secondary">
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Group</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Type</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Items</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Updated</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(prefillGroups ?? []).length === 0 ? (
                  <tr>
                    <td className="border-b border-[#eadfce] py-4 pr-4 text-[#655b50]" colSpan={5}>
                      No prefill groups loaded.
                    </td>
                  </tr>
                ) : (
                  (prefillGroups ?? []).map((group) => (
                    <tr key={group.id}>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div className="font-medium text-[#2d2926]">{group.name}</div>
                        <div className="mt-1 max-w-80 truncate text-xs text-[#7c6e5e]">
                          {group.description || "No description"}
                        </div>
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">{group.type}</td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <code className="block max-w-80 truncate text-xs">
                          {JSON.stringify(group.items)}
                        </code>
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        {formatTime(group.updated_time)}
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div className="flex flex-wrap gap-1">
                          <button
                            aria-label="Edit prefill group"
                            className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => openEditPrefillForm(group)}
                            type="button"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            aria-label="Delete prefill group"
                            className="rounded-md p-2 text-[#7a4a3b] hover:bg-[#f0dfd2]"
                            onClick={() => void handlePrefillDelete(group)}
                            type="button"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {deploymentPanelOpen && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Deployments</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655b50]">
                Operate io.net model deployments, containers, and lifecycle actions from the
                confirmed backend contract.
              </p>
              <p className="mt-2 text-xs text-[#7c6e5e]">
                {deploymentSettings
                  ? `${deploymentSettings.provider} · enabled ${String(
                      deploymentSettings.enabled,
                    )} · configured ${String(deploymentSettings.configured)}`
                  : "Deployment settings not loaded"}
              </p>
              {deploymentSettingsError && (
                <p className="mt-2 text-xs text-[#8a4d3d]">{deploymentSettingsError}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                onChange={(event) => setDeploymentKeyword(event.target.value)}
                placeholder="Search deployment"
                value={deploymentKeyword}
              />
              <select
                className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
                onChange={(event) => setDeploymentStatus(event.target.value)}
                value={deploymentStatus}
              >
                <option value="">Any status</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="destroyed">Destroyed</option>
              </select>
              <Button
                onClick={() => {
                  void reloadDeploymentSettings();
                  void reloadDeployments();
                }}
                variant="secondary"
              >
                Refresh
              </Button>
              <Button
                className="gap-2"
                onClick={() => {
                  setDeploymentForm(defaultDeploymentForm);
                  setDeploymentFormOpen((value) => !value);
                }}
              >
                <Plus className="size-4" />
                Create deployment
              </Button>
            </div>
          </div>

          {deploymentFormOpen && (
            <form className="mt-6 grid gap-4" onSubmit={handleDeploymentCreate}>
              <label className="grid gap-2 text-sm font-medium">
                Deployment request JSON
                <textarea
                  className="min-h-72 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 font-mono text-xs outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setDeploymentForm((value) => ({ ...value, payload: event.target.value }))
                  }
                  value={deploymentForm.payload}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Create deployment</Button>
                <Button
                  onClick={() => setDeploymentFormOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {deploymentsError && <p className="mt-4 text-sm text-[#8a4d3d]">{deploymentsError}</p>}
          {deploymentsLoading && (
            <p className="mt-4 text-sm text-[#655b50]">Loading deployments...</p>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Deployment</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Hardware</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Progress</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Remaining</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(deployments?.items ?? []).length === 0 ? (
                  <tr>
                    <td className="border-b border-[#eadfce] py-4 pr-4 text-[#655b50]" colSpan={6}>
                      No deployments loaded.
                    </td>
                  </tr>
                ) : (
                  (deployments?.items ?? []).map((deployment) => (
                    <tr key={deployment.id}>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div className="font-medium text-[#2d2926]">
                          {deployment.deployment_name}
                        </div>
                        <div className="mt-1 max-w-64 truncate font-mono text-xs text-[#7c6e5e]">
                          {deployment.id}
                        </div>
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">{deployment.status}</td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div>
                          {deployment.hardware_info || deployment.hardware_name || "Unknown"}
                        </div>
                        <div className="mt-1 text-xs text-[#7c6e5e]">
                          {deployment.brand_name || deployment.provider || "Provider"}
                        </div>
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        {deployment.completed_percent ?? 0}%
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        {deployment.time_remaining ||
                          `${deployment.compute_minutes_remaining ?? 0} minutes`}
                      </td>
                      <td className="border-b border-[#eadfce] py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleDeploymentContainers(deployment)}
                            type="button"
                          >
                            Containers
                          </button>
                          <button
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleDeploymentRename(deployment)}
                            type="button"
                          >
                            Rename
                          </button>
                          <button
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                            onClick={() => void handleDeploymentExtend(deployment)}
                            type="button"
                          >
                            Extend
                          </button>
                          <button
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#7a4a3b] hover:bg-[#f0dfd2]"
                            onClick={() => void handleDeploymentDelete(deployment)}
                            type="button"
                          >
                            Terminate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedDeployment && (
            <div className="mt-6 rounded-md border border-[#ddcfbd] bg-[#f8f1e7] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#2d2926]">
                    {selectedDeployment.deployment_name} containers
                  </p>
                  <p className="mt-1 text-xs text-[#7c6e5e]">
                    {deploymentContainers?.total ?? 0} container(s)
                  </p>
                </div>
                <Button onClick={() => setSelectedDeployment(null)} variant="secondary">
                  Close
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(deploymentContainers?.containers ?? []).map((container) => (
                  <div
                    className="rounded-md border border-[#e1d3c0] bg-[#fffaf3] p-3"
                    key={container.container_id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-mono text-xs font-medium text-[#2d2926]">
                          {container.container_id}
                        </p>
                        <p className="mt-1 text-xs text-[#7c6e5e]">
                          {container.hardware || "Unknown hardware"} · {container.status}
                        </p>
                      </div>
                      {container.public_url && (
                        <a
                          className="text-xs font-medium text-[#5f554b] underline"
                          href={container.public_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open
                        </a>
                      )}
                    </div>
                    <div className="mt-3 max-h-28 space-y-1 overflow-auto text-xs text-[#655b50]">
                      {(container.events ?? []).length === 0
                        ? "No events"
                        : (container.events ?? []).map((event) => (
                            <p key={`${event.time}-${event.message}`}>
                              {formatTime(event.time)} · {event.message}
                            </p>
                          ))}
                    </div>
                  </div>
                ))}
              </div>
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
