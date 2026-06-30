import { useState, type FormEvent } from "react";
import {
  BadgeCheck,
  BadgeX,
  Copy,
  Eye,
  Gauge,
  Pencil,
  RefreshCw,
  Tags,
  Trash2,
  Wifi,
} from "lucide-react";
import { useAuthStore } from "@features/auth/store";
import * as channelsApi from "@features/admin/channels/api";
import type { AdminChannel } from "@features/admin/channels/api";
import { isRootUser } from "@shared/lib/roles";
import { formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { Modal } from "@shared/ui/modal";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const CHANNEL_STATUS_ENABLED = 1;
const CHANNEL_STATUS_MANUAL_DISABLED = 2;
const CHANNEL_TYPE_CODEX = 57;
const pageSize = 20;

const channelTypes = [
  { label: "OpenAI", value: 1 },
  { label: "Azure", value: 3 },
  { label: "Ollama", value: 4 },
  { label: "Custom", value: 8 },
  { label: "Anthropic", value: 14 },
  { label: "OpenRouter", value: 20 },
  { label: "Gemini", value: 24 },
  { label: "DeepSeek", value: 43 },
  { label: "xAI", value: 48 },
  { label: "ChatGPT Subscription (Codex)", value: CHANNEL_TYPE_CODEX },
];

interface ChannelFormState {
  baseUrl: string;
  group: string;
  key: string;
  keyMode: "append" | "replace";
  models: string;
  multiKeyMode: string;
  name: string;
  priority: string;
  remark: string;
  tag: string;
  testModel: string;
  type: string;
  weight: string;
}

const defaultForm: ChannelFormState = {
  baseUrl: "",
  group: "default",
  key: "",
  keyMode: "replace",
  models: "gpt-4o-mini",
  multiKeyMode: "",
  name: "",
  priority: "0",
  remark: "",
  tag: "",
  testModel: "",
  type: "1",
  weight: "0",
};

function getChannelTypeLabel(type: number) {
  return channelTypes.find((item) => item.value === type)?.label ?? `Type ${type}`;
}

function getStatusLabel(status: number) {
  if (status === CHANNEL_STATUS_ENABLED) {
    return "Enabled";
  }

  if (status === CHANNEL_STATUS_MANUAL_DISABLED) {
    return "Disabled";
  }

  return "Auto disabled";
}

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleDateString();
}

function splitModels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");
}

function toForm(channel: AdminChannel): ChannelFormState {
  return {
    baseUrl: channel.base_url ?? "",
    group: channel.group || "default",
    key: "",
    keyMode: "replace",
    models: channel.models ?? "",
    multiKeyMode: channel.channel_info?.multi_key_mode ?? "",
    name: channel.name,
    priority: String(channel.priority ?? 0),
    remark: channel.remark ?? "",
    tag: channel.tag ?? "",
    testModel: channel.test_model ?? "",
    type: String(channel.type),
    weight: String(channel.weight ?? 0),
  };
}

function toChannelPayload(form: ChannelFormState, existing?: AdminChannel): Partial<AdminChannel> {
  return {
    ...existing,
    auto_ban: existing?.auto_ban ?? 1,
    base_url: form.baseUrl.trim(),
    group: form.group.trim() || "default",
    ...(form.key ? { key: form.key.trim() } : undefined),
    ...(existing?.channel_info?.is_multi_key && form.key ? { key_mode: form.keyMode } : undefined),
    model_mapping: existing?.model_mapping ?? "",
    models: splitModels(form.models),
    ...(existing?.channel_info?.is_multi_key && form.multiKeyMode
      ? { multi_key_mode: form.multiKeyMode }
      : undefined),
    name: form.name.trim(),
    priority: Number(form.priority) || 0,
    remark: form.remark.trim(),
    status: existing?.status ?? CHANNEL_STATUS_ENABLED,
    tag: form.tag.trim(),
    test_model: form.testModel.trim(),
    type: Number(form.type) || 1,
    weight: Number(form.weight) || 0,
  };
}

export function AdminChannelsPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const user = useAuthStore((state) => state.user);
  const canRevealSecrets = isRootUser(user);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [group, setGroup] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    group: "",
    keyword: "",
    model: "",
    status: "",
    type: "",
  });
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingChannel, setEditingChannel] = useState<AdminChannel | null>(null);
  const [form, setForm] = useState<ChannelFormState>(defaultForm);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchTag, setBatchTag] = useState("");
  const [tagActionValue, setTagActionValue] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<{
    channelId: number;
    channelName: string;
    key: string;
  } | null>(null);
  const [operationResult, setOperationResult] = useState<{
    body: unknown;
    title: string;
    upstreamStatus?: number;
  } | null>(null);
  const [upstreamReview, setUpstreamReview] = useState<channelsApi.UpstreamModelDetection | null>(
    null,
  );
  const [multiKeyStatus, setMultiKeyStatus] = useState<{
    channelId: number;
    channelName: string;
    data: channelsApi.MultiKeyStatusResponse;
  } | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const hasFilters = Object.values(appliedFilters).some(Boolean);
    const query = {
      p: page,
      page_size: pageSize,
      group: appliedFilters.group || undefined,
      id_sort: true,
      keyword: appliedFilters.keyword || undefined,
      model: appliedFilters.model || undefined,
      status: appliedFilters.status ? Number(appliedFilters.status) : undefined,
      type: appliedFilters.type ? Number(appliedFilters.type) : undefined,
    };

    const response = hasFilters
      ? await channelsApi.searchChannels(query)
      : await channelsApi.listChannels(query);
    return response.data;
  }, [page, appliedFilters]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      group: group.trim(),
      keyword: keyword.trim(),
      model: model.trim(),
      status,
      type,
    });
  }

  function openCreateForm() {
    setForm(defaultForm);
    setEditingChannel(null);
    setFormMode("create");
    setActionMessage(null);
  }

  function openEditForm(channel: AdminChannel) {
    setForm(toForm(channel));
    setEditingChannel(channel);
    setFormMode("edit");
    setActionMessage(null);
  }

  function closePanel() {
    setFormMode(null);
    setEditingChannel(null);
    setActionMessage(null);
    setRevealedSecret(null);
    setOperationResult(null);
    setUpstreamReview(null);
    setMultiKeyStatus(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    if (!form.name.trim()) {
      setActionMessage("Channel name is required.");
      return;
    }

    if (formMode === "create" && !form.key.trim()) {
      setActionMessage("API key is required for a new channel.");
      return;
    }

    try {
      if (formMode === "create") {
        await channelsApi.createChannel({
          channel: toChannelPayload(form),
          mode: "single",
        });
        setActionMessage("Channel created.");
      } else if (editingChannel) {
        await channelsApi.updateChannel({
          ...toChannelPayload(form, editingChannel),
          id: editingChannel.id,
        });
        setActionMessage("Channel updated.");
      }

      setFormMode(null);
      setEditingChannel(null);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Channel action failed");
    }
  }

  async function handleDelete(channel: AdminChannel) {
    const result = await confirmSensitive({
      actionLabel: "Delete channel",
      confirmText: channel.name,
      description: `This removes channel "${channel.name}" from routing. Requests depending on this channel may fail or move to another provider.`,
      reasonLabel: "Reason for audit context",
      title: "Delete channel",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await channelsApi.deleteChannel(channel.id);
      setActionMessage("Channel deleted.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Delete failed");
    }
  }

  async function handleStatus(channel: AdminChannel) {
    const nextStatus =
      channel.status === CHANNEL_STATUS_ENABLED
        ? CHANNEL_STATUS_MANUAL_DISABLED
        : CHANNEL_STATUS_ENABLED;
    const result = await confirmSensitive({
      actionLabel: nextStatus === CHANNEL_STATUS_ENABLED ? "Enable channel" : "Disable channel",
      description:
        nextStatus === CHANNEL_STATUS_ENABLED
          ? `This allows "${channel.name}" to receive routed requests again.`
          : `This stops "${channel.name}" from receiving routed requests.`,
      intent: nextStatus === CHANNEL_STATUS_ENABLED ? "warning" : "danger",
      reasonLabel: "Reason for audit context",
      title: nextStatus === CHANNEL_STATUS_ENABLED ? "Enable channel" : "Disable channel",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await channelsApi.updateChannel({
        ...channel,
        status: nextStatus,
      });
      setActionMessage("Channel status updated.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Status update failed");
    }
  }

  async function handleCopy(channel: AdminChannel) {
    setActionMessage(null);

    try {
      await channelsApi.copyChannel(channel.id);
      setActionMessage("Channel copied.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Copy failed");
    }
  }

  async function handleTest(channel: AdminChannel) {
    setActionMessage(null);

    try {
      const response = await channelsApi.testChannel(channel.id, channel.test_model ?? undefined);
      setActionMessage(`Channel test passed in ${response.time.toFixed(2)}s.`);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Test failed");
    }
  }

  async function handleBalance(channel: AdminChannel) {
    setActionMessage(null);

    try {
      const response = await channelsApi.updateChannelBalance(channel.id);
      setActionMessage(`Balance updated: $${response.balance.toFixed(4)}.`);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Balance query failed");
    }
  }

  async function handleFetchModelsIntoForm() {
    const normalizedKey = form.key.trim();
    if (!normalizedKey) {
      setActionMessage("Enter a provider API key before fetching models into the form.");
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Fetch models",
      description:
        "This sends the currently typed provider key and base URL to the backend to fetch upstream-visible models, then fills the Models field.",
      reasonLabel: "Reason for audit context",
      title: "Fetch provider models into form",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await channelsApi.fetchModelsFromProvider({
        base_url: form.baseUrl.trim() || undefined,
        key: normalizedKey,
        type: Number(form.type) || 1,
      });
      setForm((value) => ({
        ...value,
        models: response.data.join(","),
      }));
      setActionMessage(`Fetched ${response.data.length} model(s) into the form.`);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Provider model fetch failed");
    }
  }

  function showOperationResult(title: string, body: unknown, upstreamStatus?: number) {
    setFormMode(null);
    setEditingChannel(null);
    setRevealedSecret(null);
    setMultiKeyStatus(null);
    setOperationResult({ body, title, upstreamStatus });
  }

  async function handleFetchUpstreamModels(channel: AdminChannel) {
    setActionMessage(null);

    try {
      const response = await channelsApi.fetchUpstreamModels(channel.id);
      showOperationResult(`${channel.name} upstream models`, response.data);
      setActionMessage(`Fetched ${response.data.length} upstream model(s).`);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Upstream model fetch failed");
    }
  }

  async function handleDetectUpstreamModels(channel: AdminChannel) {
    const result = await confirmSensitive({
      actionLabel: "Detect models",
      description: `This checks upstream-visible models for "${channel.name}" and stores pending model changes for review.`,
      reasonLabel: "Reason for audit context",
      title: "Detect upstream model changes",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await channelsApi.detectUpstreamModelUpdates({ id: channel.id });
      setUpstreamReview(response.data);
      showOperationResult(`${channel.name} model update detection`, response.data);
      setActionMessage(
        `Detected ${response.data.add_models.length} add and ${response.data.remove_models.length} remove candidate(s).`,
      );
      await reload();
    } catch (caught) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Upstream model detection failed",
      );
    }
  }

  async function handleApplyUpstreamModels() {
    if (!upstreamReview) {
      setActionMessage("Run upstream detection before applying model changes.");
      return;
    }

    const addCount = upstreamReview.add_models.length;
    const removeCount = upstreamReview.remove_models.length;
    const result = await confirmSensitive({
      actionLabel: "Apply model changes",
      confirmText: upstreamReview.channel_name,
      description: `This applies ${addCount} add and ${removeCount} remove candidate(s) to "${upstreamReview.channel_name}". The channel model list and routing abilities may change immediately.`,
      intent: "danger",
      reasonLabel: "Reason for audit context",
      requireReason: true,
      title: "Apply upstream model changes",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await channelsApi.applyUpstreamModelUpdates({
        add_models: upstreamReview.add_models,
        id: upstreamReview.channel_id,
        remove_models: upstreamReview.remove_models,
      });
      setUpstreamReview(null);
      showOperationResult(`${upstreamReview.channel_name} applied model changes`, response.data);
      setActionMessage(
        `Applied ${response.data.added_models.length} added and ${response.data.removed_models.length} removed model(s).`,
      );
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Upstream model apply failed");
    }
  }

  async function loadMultiKeyStatus(channel: AdminChannel) {
    setActionMessage(null);

    try {
      const response = await channelsApi.manageMultiKeys({
        action: "get_key_status",
        channel_id: channel.id,
        page: 1,
        page_size: 50,
      });
      setFormMode(null);
      setEditingChannel(null);
      setRevealedSecret(null);
      setOperationResult(null);
      setMultiKeyStatus({
        channelId: channel.id,
        channelName: channel.name,
        data: response.data as channelsApi.MultiKeyStatusResponse,
      });
      setActionMessage("Multi-key status loaded.");
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Multi-key status query failed");
    }
  }

  async function handleMultiKeyAction(
    action: channelsApi.MultiKeyManageRequest["action"],
    keyIndex?: number,
  ) {
    if (!multiKeyStatus) {
      setActionMessage("Open a multi-key status panel first.");
      return;
    }

    const destructive =
      action === "delete_key" || action === "delete_disabled_keys" || action === "disable_all_keys";
    const result = await confirmSensitive({
      actionLabel: action.replaceAll("_", " "),
      confirmText: destructive ? multiKeyStatus.channelName : undefined,
      description: `This runs "${action}" on multi-key channel "${multiKeyStatus.channelName}".`,
      intent: destructive ? "danger" : "warning",
      reasonLabel: "Reason for audit context",
      title: "Manage multi-key channel",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await channelsApi.manageMultiKeys({
        action,
        channel_id: multiKeyStatus.channelId,
        key_index: keyIndex,
      });
      const refreshed = await channelsApi.manageMultiKeys({
        action: "get_key_status",
        channel_id: multiKeyStatus.channelId,
        page: 1,
        page_size: 50,
      });
      setMultiKeyStatus((value) =>
        value
          ? {
              ...value,
              data: refreshed.data as channelsApi.MultiKeyStatusResponse,
            }
          : value,
      );
      setActionMessage("Multi-key action completed.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Multi-key action failed");
    }
  }

  async function handleRevealKey(channel: AdminChannel) {
    const result = await confirmSensitive({
      actionLabel: "Reveal key",
      confirmText: channel.name,
      description: `This reveals the live provider credential for "${channel.name}". The backend requires root access and secure verification, and the operation is written to the management audit log.`,
      intent: "danger",
      reasonLabel: "Reason for audit context",
      requireReason: true,
      title: "Reveal channel secret",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);
    setRevealedSecret(null);

    try {
      const response = await channelsApi.revealChannelKey(channel.id);
      setRevealedSecret({
        channelId: channel.id,
        channelName: channel.name,
        key: response.data.key,
      });
      setActionMessage("Channel secret revealed. Close this panel when finished.");
    } catch (caught) {
      setActionMessage(
        caught instanceof Error
          ? caught.message
          : "Secret reveal failed. Root access or secure verification may be required.",
      );
    }
  }

  async function handleCopyRevealedSecret() {
    if (!revealedSecret) {
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Copy secret",
      confirmText: revealedSecret.channelName,
      description:
        "This copies the already revealed channel secret to the clipboard. The backend audit trail is tied to the reveal action.",
      intent: "danger",
      reasonLabel: "Reason for audit context",
      requireReason: true,
      title: "Copy revealed channel secret",
    });

    if (!result.confirmed) {
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedSecret.key);
      setActionMessage("Revealed secret copied to clipboard.");
    } catch {
      setActionMessage("Clipboard copy failed. Select the revealed text manually.");
    }
  }

  async function handleDownloadRevealedSecret() {
    if (!revealedSecret) {
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Download secret",
      confirmText: revealedSecret.channelName,
      description:
        "This exports the already revealed channel secret as a local text file. The backend audit trail is tied to the reveal action.",
      intent: "danger",
      reasonLabel: "Reason for audit context",
      requireReason: true,
      title: "Download revealed channel secret",
    });

    if (!result.confirmed) {
      return;
    }

    const blob = new Blob([revealedSecret.key], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `channel-${revealedSecret.channelId}-secret.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setActionMessage("Revealed secret export prepared.");
  }

  function isSelected(id: number) {
    return selectedIds.includes(id);
  }

  function toggleSelected(id: number) {
    setSelectedIds((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  }

  function toggleCurrentPageSelection() {
    const currentIds = data?.items.map((channel) => channel.id) ?? [];
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));

    setSelectedIds((value) =>
      allSelected
        ? value.filter((id) => !currentIds.includes(id))
        : Array.from(new Set([...value, ...currentIds])),
    );
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) {
      setActionMessage("Select at least one channel first.");
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Delete selected",
      confirmText: `delete ${selectedIds.length}`,
      description: `This removes ${selectedIds.length} selected channel(s) from routing. Type "delete ${selectedIds.length}" to confirm.`,
      intent: "danger",
      reasonLabel: "Reason for audit context",
      title: "Batch delete channels",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await channelsApi.deleteChannelsBatch({ ids: selectedIds });
      setSelectedIds([]);
      setActionMessage(`Deleted ${response.data} channel(s).`);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Batch delete failed");
    }
  }

  async function handleBatchSetTag() {
    if (selectedIds.length === 0) {
      setActionMessage("Select at least one channel first.");
      return;
    }

    const normalizedTag = batchTag.trim();
    const result = await confirmSensitive({
      actionLabel: normalizedTag ? "Set tag" : "Clear tag",
      description: normalizedTag
        ? `This sets tag "${normalizedTag}" on ${selectedIds.length} selected channel(s).`
        : `This clears the tag on ${selectedIds.length} selected channel(s).`,
      reasonLabel: "Reason for audit context",
      title: normalizedTag ? "Batch set channel tag" : "Batch clear channel tag",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await channelsApi.setChannelsTagBatch({
        ids: selectedIds,
        tag: normalizedTag || null,
      });
      setActionMessage(`Updated tag for ${response.data} channel(s).`);
      setBatchTag("");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Batch tag update failed");
    }
  }

  async function handleDeleteDisabledChannels() {
    const result = await confirmSensitive({
      actionLabel: "Delete disabled",
      confirmText: "delete disabled",
      description:
        'This removes every disabled channel from the platform. Type "delete disabled" to confirm.',
      intent: "danger",
      reasonLabel: "Reason for audit context",
      title: "Delete all disabled channels",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await channelsApi.deleteDisabledChannels();
      setSelectedIds([]);
      setActionMessage(`Deleted ${response.data} disabled channel(s).`);
      await reload();
    } catch (caught) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Delete disabled channels failed",
      );
    }
  }

  async function handleTagStatus(next: "enable" | "disable") {
    const normalizedTag = tagActionValue.trim();
    if (!normalizedTag) {
      setActionMessage("Enter a tag before running a tag operation.");
      return;
    }

    const result = await confirmSensitive({
      actionLabel: next === "enable" ? "Enable tag" : "Disable tag",
      confirmText: normalizedTag,
      description:
        next === "enable"
          ? `This allows every channel tagged "${normalizedTag}" to receive routed requests.`
          : `This stops every channel tagged "${normalizedTag}" from receiving routed requests.`,
      intent: next === "enable" ? "warning" : "danger",
      reasonLabel: "Reason for audit context",
      title: next === "enable" ? "Enable channels by tag" : "Disable channels by tag",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      if (next === "enable") {
        await channelsApi.enableChannelsByTag({ tag: normalizedTag });
      } else {
        await channelsApi.disableChannelsByTag({ tag: normalizedTag });
      }
      setActionMessage(
        `${next === "enable" ? "Enabled" : "Disabled"} channels tagged "${normalizedTag}".`,
      );
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Tag status update failed");
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const currentPageIds = data?.items.map((channel) => channel.id) ?? [];
  const currentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="Operate provider channels, health checks, balances, groups, and routing visibility from one admin surface."
          title="Channels"
        />
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => void reload()} variant="secondary">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button className="gap-2" onClick={openCreateForm}>
            <Wifi className="size-4" />
            Add channel
          </Button>
        </div>
      </div>

      <Card>
        <form
          className="grid gap-3 xl:grid-cols-[1.4fr_0.9fr_0.9fr_0.75fr_0.85fr_auto]"
          onSubmit={applyFilters}
        >
          <input
            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search channel name"
            value={keyword}
          />
          <input
            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setModel(event.target.value)}
            placeholder="Model contains"
            value={model}
          />
          <input
            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setGroup(event.target.value)}
            placeholder="Group"
            value={group}
          />
          <select
            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Any status</option>
            <option value={CHANNEL_STATUS_ENABLED}>Enabled</option>
            <option value={0}>Disabled</option>
          </select>
          <select
            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setType(event.target.value)}
            value={type}
          >
            <option value="">Any type</option>
            {channelTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <Card className="border-[#d0c0aa] bg-[#fffdfd]/88">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#6c6a67]">
              <Tags className="size-4" />
              Batch operations
            </div>
            <p className="mt-2 text-sm leading-6 text-[#5f5958]">
              {selectedIds.length} selected. Batch delete and tag updates apply to selected
              channels; tag status actions apply to every channel with that tag.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(180px,260px)_auto_auto] xl:min-w-[620px]">
            <input
              className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 text-sm outline-none focus:border-[#000000]"
              onChange={(event) => setBatchTag(event.target.value)}
              placeholder="Tag for selected channels"
              value={batchTag}
            />
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => void handleBatchSetTag()}
              variant="secondary"
            >
              Set tag
            </Button>
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => void handleBatchDelete()}
              variant="secondary"
            >
              Delete selected
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(180px,260px)_auto_auto_auto]">
          <input
            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 text-sm outline-none focus:border-[#000000]"
            onChange={(event) => setTagActionValue(event.target.value)}
            placeholder="Tag for enable/disable"
            value={tagActionValue}
          />
          <Button onClick={() => void handleTagStatus("enable")} variant="secondary">
            Enable tag
          </Button>
          <Button onClick={() => void handleTagStatus("disable")} variant="secondary">
            Disable tag
          </Button>
          <Button onClick={() => void handleDeleteDisabledChannels()} variant="secondary">
            Delete disabled
          </Button>
        </div>
      </Card>

      <Modal
        className="max-w-6xl"
        description={actionMessage}
        onClose={closePanel}
        open={Boolean(formMode || actionMessage || revealedSecret || operationResult || multiKeyStatus)}
        title={
          formMode === "create"
            ? "Add channel"
            : formMode === "edit"
              ? `Edit ${editingChannel?.name}`
              : "Channel action"
        }
      >

          {formMode && (
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
                Type
                <select
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}
                  value={form.type}
                >
                  {channelTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                API key
                <textarea
                  className="min-h-24 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 py-2 font-mono text-xs outline-none focus:border-[#000000]"
                  onChange={(event) => setForm((value) => ({ ...value, key: event.target.value }))}
                  placeholder={
                    formMode === "edit"
                      ? "Leave blank to keep the existing key"
                      : "Provider API key"
                  }
                  required={formMode === "create"}
                  value={form.key}
                />
              </label>
              {editingChannel?.channel_info?.is_multi_key && (
                <>
                  <label className="grid gap-2 text-sm font-medium">
                    Key update mode
                    <select
                      className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          keyMode: event.target.value as "append" | "replace",
                        }))
                      }
                      value={form.keyMode}
                    >
                      <option value="replace">Replace typed keys</option>
                      <option value="append">Append typed keys</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Multi-key routing mode
                    <select
                      className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                      onChange={(event) =>
                        setForm((value) => ({ ...value, multiKeyMode: event.target.value }))
                      }
                      value={form.multiKeyMode}
                    >
                      <option value="">Keep current mode</option>
                      <option value="random">Random</option>
                      <option value="polling">Polling</option>
                    </select>
                  </label>
                </>
              )}
              <label className="grid gap-2 text-sm font-medium">
                Base URL
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, baseUrl: event.target.value }))
                  }
                  placeholder="Optional provider base URL"
                  value={form.baseUrl}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Group
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, group: event.target.value }))
                  }
                  value={form.group}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Models
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                    onChange={(event) =>
                      setForm((value) => ({ ...value, models: event.target.value }))
                    }
                    placeholder="Comma-separated model names"
                    required
                    value={form.models}
                  />
                  {canRevealSecrets && (
                    <Button onClick={() => void handleFetchModelsIntoForm()} variant="secondary">
                      Fetch provider models
                    </Button>
                  )}
                </div>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Test model
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, testModel: event.target.value }))
                  }
                  value={form.testModel}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tag
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) => setForm((value) => ({ ...value, tag: event.target.value }))}
                  value={form.tag}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Priority
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, priority: event.target.value }))
                  }
                  type="number"
                  value={form.priority}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Weight
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, weight: event.target.value }))
                  }
                  type="number"
                  value={form.weight}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Remark
                <input
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                  maxLength={255}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, remark: event.target.value }))
                  }
                  value={form.remark}
                />
              </label>
              <Button className="justify-self-start md:col-span-2" type="submit">
                {formMode === "create" ? "Add channel" : "Save channel"}
              </Button>
            </form>
          )}

          {revealedSecret && (
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    {revealedSecret.channelName}
                  </p>
                  <p className="mt-1 text-xs text-[#6c6a67]">
                    Channel #{revealedSecret.channelId} · root-only secret view
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleCopyRevealedSecret()} variant="secondary">
                    Copy secret
                  </Button>
                  <Button onClick={() => void handleDownloadRevealedSecret()} variant="secondary">
                    Download secret
                  </Button>
                  <Button onClick={() => setRevealedSecret(null)} variant="secondary">
                    Hide secret
                  </Button>
                </div>
              </div>
              <pre className="mt-4 max-h-64 overflow-auto rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-3 font-mono text-xs leading-5 text-[#3b3736]">
                {revealedSecret.key}
              </pre>
            </div>
          )}

          {operationResult && (
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#171717]">{operationResult.title}</p>
                  <p className="mt-1 text-xs text-[#6c6a67]">
                    {operationResult.upstreamStatus
                      ? `Upstream status ${operationResult.upstreamStatus}`
                      : "Channel operation result"}
                  </p>
                </div>
                <Button onClick={() => setOperationResult(null)} variant="secondary">
                  Close result
                </Button>
              </div>
              <pre className="mt-4 max-h-80 overflow-auto rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-3 font-mono text-xs leading-5 text-[#3b3736]">
                {JSON.stringify(operationResult.body, null, 2)}
              </pre>
              {upstreamReview && (
                <div className="mt-4 border-t border-[#d8d2d2] pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">
                        Pending upstream changes
                      </p>
                      <p className="mt-1 text-xs text-[#6c6a67]">
                        {upstreamReview.add_models.length} add ·{" "}
                        {upstreamReview.remove_models.length} remove · auto added{" "}
                        {upstreamReview.auto_added_models}
                      </p>
                    </div>
                    <Button
                      disabled={
                        upstreamReview.add_models.length === 0 &&
                        upstreamReview.remove_models.length === 0
                      }
                      onClick={() => void handleApplyUpstreamModels()}
                    >
                      Apply detected changes
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6a67]">
                        Add candidates
                      </p>
                      <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-auto">
                        {upstreamReview.add_models.length > 0 ? (
                          upstreamReview.add_models.map((item) => (
                            <span
                              className="rounded-[2px] bg-[#e7ddcb] px-2 py-1 font-mono text-xs"
                              key={item}
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#6c6a67]">No add candidates</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6a67]">
                        Remove candidates
                      </p>
                      <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-auto">
                        {upstreamReview.remove_models.length > 0 ? (
                          upstreamReview.remove_models.map((item) => (
                            <span
                              className="rounded-[2px] bg-[#efeded] px-2 py-1 font-mono text-xs text-[#7f1d1d]"
                              key={item}
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#6c6a67]">No remove candidates</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {multiKeyStatus && (
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    {multiKeyStatus.channelName} multi-key status
                  </p>
                  <p className="mt-1 text-xs text-[#6c6a67]">
                    {multiKeyStatus.data.enabled_count} enabled ·{" "}
                    {multiKeyStatus.data.manual_disabled_count} manual disabled ·{" "}
                    {multiKeyStatus.data.auto_disabled_count} auto disabled
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void handleMultiKeyAction("enable_all_keys")}
                    variant="secondary"
                  >
                    Enable all
                  </Button>
                  <Button
                    onClick={() => void handleMultiKeyAction("disable_all_keys")}
                    variant="secondary"
                  >
                    Disable all
                  </Button>
                  <Button
                    onClick={() => void handleMultiKeyAction("delete_disabled_keys")}
                    variant="secondary"
                  >
                    Delete auto-disabled
                  </Button>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.16em] text-[#6c6a67]">
                    <tr>
                      <th className="border-b border-[#d8d2d2] py-3 pr-4">Index</th>
                      <th className="border-b border-[#d8d2d2] py-3 pr-4">Preview</th>
                      <th className="border-b border-[#d8d2d2] py-3 pr-4">Status</th>
                      <th className="border-b border-[#d8d2d2] py-3 pr-4">Reason</th>
                      <th className="border-b border-[#d8d2d2] py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multiKeyStatus.data.keys.map((item) => (
                      <tr key={item.index}>
                        <td className="border-b border-[#efeded] py-3 pr-4">{item.index}</td>
                        <td className="border-b border-[#efeded] py-3 pr-4 font-mono text-xs">
                          {item.key_preview}
                        </td>
                        <td className="border-b border-[#efeded] py-3 pr-4">
                          {item.status === 1
                            ? "Enabled"
                            : item.status === 2
                              ? "Manual disabled"
                              : "Auto disabled"}
                        </td>
                        <td className="border-b border-[#efeded] py-3 pr-4">
                          {item.reason || "None"}
                        </td>
                        <td className="border-b border-[#efeded] py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-[2px] px-2 py-1 text-xs font-medium text-[#3b3736] hover:bg-[#efeded]"
                              onClick={() =>
                                void handleMultiKeyAction(
                                  item.status === 1 ? "disable_key" : "enable_key",
                                  item.index,
                                )
                              }
                              type="button"
                            >
                              {item.status === 1 ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="rounded-[2px] px-2 py-1 text-xs font-medium text-[#7f1d1d] hover:bg-[#efeded]"
                              onClick={() => void handleMultiKeyAction("delete_key", item.index)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </Modal>

      {loading && <LoadingBlock title="Loading channels" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Channels unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock
          actionLabel="Add channel"
          description="No channels match the current filters. Add a provider channel or clear the search."
          onAction={openCreateForm}
          title="No channels found"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Channel inventory</h2>
              <p className="mt-2 text-sm text-[#5f5958]">
                Showing {data.items.length} of {data.total} channels.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#6c6a67]">
                <tr>
                  <th className="w-10 border-b border-[#d8d2d2] py-3 pr-4">
                    <input
                      aria-label="Select current page channels"
                      checked={currentPageSelected}
                      className="size-4 accent-[#000000]"
                      onChange={toggleCurrentPageSelection}
                      type="checkbox"
                    />
                  </th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Channel</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Type</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Status</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Group</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Models</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Health</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Balance</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((channel) => (
                  <tr key={channel.id}>
                    <td className="border-b border-[#efeded] py-4 pr-4 align-top">
                      <input
                        aria-label={`Select ${channel.name}`}
                        checked={isSelected(channel.id)}
                        className="size-4 accent-[#000000]"
                        onChange={() => toggleSelected(channel.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div className="font-medium text-[#171717]">{channel.name}</div>
                      <div className="mt-1 text-xs text-[#6c6a67]">
                        #{channel.id}
                        {channel.tag ? ` · ${channel.tag}` : ""}
                        {channel.base_url ? ` · ${channel.base_url}` : ""}
                      </div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      {getChannelTypeLabel(channel.type)}
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {channel.status === CHANNEL_STATUS_ENABLED ? (
                          <BadgeCheck className="size-4 text-[#63785f]" />
                        ) : (
                          <BadgeX className="size-4 text-[#7f1d1d]" />
                        )}
                        {getStatusLabel(channel.status)}
                      </span>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">{channel.group}</td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div className="max-w-72 truncate font-mono text-xs text-[#5f5958]">
                        {channel.models || "None"}
                      </div>
                      {channel.test_model && (
                        <div className="mt-1 text-xs text-[#6c6a67]">Test {channel.test_model}</div>
                      )}
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div>
                        {channel.response_time ? `${channel.response_time}ms` : "Not tested"}
                      </div>
                      <div className="mt-1 text-xs text-[#6c6a67]">
                        {formatTime(channel.test_time)}
                      </div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div>${formatRawNumber(channel.balance)}</div>
                      <div className="mt-1 text-xs text-[#6c6a67]">
                        Used {formatRawNumber(channel.used_quota)}
                      </div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          aria-label="Edit channel"
                          className="rounded-[2px] p-2 text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => openEditForm(channel)}
                          type="button"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          aria-label="Test channel"
                          className="rounded-[2px] p-2 text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleTest(channel)}
                          type="button"
                        >
                          <Gauge className="size-4" />
                        </button>
                        <button
                          aria-label="Update balance"
                          className="rounded-[2px] px-2 text-xs font-medium text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleBalance(channel)}
                          type="button"
                        >
                          Balance
                        </button>
                        <button
                          aria-label="Fetch upstream models"
                          className="rounded-[2px] px-2 text-xs font-medium text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleFetchUpstreamModels(channel)}
                          type="button"
                        >
                          Fetch models
                        </button>
                        <button
                          aria-label="Detect upstream model changes"
                          className="rounded-[2px] px-2 text-xs font-medium text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleDetectUpstreamModels(channel)}
                          type="button"
                        >
                          Detect upstream
                        </button>
                        {channel.channel_info?.is_multi_key && (
                          <button
                            aria-label="Manage multi-key status"
                            className="rounded-[2px] px-2 text-xs font-medium text-[#3b3736] hover:bg-[#efeded]"
                            onClick={() => void loadMultiKeyStatus(channel)}
                            type="button"
                          >
                            Key status
                          </button>
                        )}
                        {canRevealSecrets && (
                          <button
                            aria-label="Reveal channel secret"
                            className="rounded-[2px] p-2 text-[#7f1d1d] hover:bg-[#efeded]"
                            onClick={() => void handleRevealKey(channel)}
                            type="button"
                          >
                            <Eye className="size-4" />
                          </button>
                        )}
                        <button
                          aria-label="Copy channel"
                          className="rounded-[2px] p-2 text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleCopy(channel)}
                          type="button"
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          aria-label={
                            channel.status === CHANNEL_STATUS_ENABLED
                              ? "Disable channel"
                              : "Enable channel"
                          }
                          className="rounded-[2px] p-2 text-[#3b3736] hover:bg-[#efeded]"
                          onClick={() => void handleStatus(channel)}
                          type="button"
                        >
                          {channel.status === CHANNEL_STATUS_ENABLED ? (
                            <BadgeX className="size-4" />
                          ) : (
                            <BadgeCheck className="size-4" />
                          )}
                        </button>
                        <button
                          aria-label="Delete channel"
                          className="rounded-[2px] p-2 text-[#7f1d1d] hover:bg-[#efeded]"
                          onClick={() => void handleDelete(channel)}
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
