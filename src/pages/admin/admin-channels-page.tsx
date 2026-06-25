import { useState, type FormEvent } from "react";
import { BadgeCheck, BadgeX, Copy, Gauge, Pencil, RefreshCw, Trash2, Wifi, X } from "lucide-react";
import * as channelsApi from "@features/admin/channels/api";
import type { AdminChannel } from "@features/admin/channels/api";
import { formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const CHANNEL_STATUS_ENABLED = 1;
const CHANNEL_STATUS_MANUAL_DISABLED = 2;
const pageSize = 20;

const channelTypes = [
  { label: "OpenAI", value: 1 },
  { label: "Azure", value: 3 },
  { label: "Custom", value: 8 },
  { label: "Anthropic", value: 14 },
  { label: "OpenRouter", value: 20 },
  { label: "Gemini", value: 24 },
  { label: "DeepSeek", value: 43 },
  { label: "xAI", value: 48 },
];

interface ChannelFormState {
  baseUrl: string;
  group: string;
  key: string;
  models: string;
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
  models: "gpt-4o-mini",
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
    models: channel.models ?? "",
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
    model_mapping: existing?.model_mapping ?? "",
    models: splitModels(form.models),
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
    if (!window.confirm(`Delete channel "${channel.name}"?`)) {
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
    setActionMessage(null);

    try {
      await channelsApi.updateChannel({
        ...channel,
        status:
          channel.status === CHANNEL_STATUS_ENABLED
            ? CHANNEL_STATUS_MANUAL_DISABLED
            : CHANNEL_STATUS_ENABLED,
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

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

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
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search channel name"
            value={keyword}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setModel(event.target.value)}
            placeholder="Model contains"
            value={model}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setGroup(event.target.value)}
            placeholder="Group"
            value={group}
          />
          <select
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Any status</option>
            <option value={CHANNEL_STATUS_ENABLED}>Enabled</option>
            <option value={0}>Disabled</option>
          </select>
          <select
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
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

      {(formMode || actionMessage) && (
        <Card className="border-[#c9baa4]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {formMode === "create"
                  ? "Add channel"
                  : formMode === "edit"
                    ? `Edit ${editingChannel?.name}`
                    : "Channel action"}
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
                Name
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                  required
                  value={form.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Type
                <select
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
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
                  className="min-h-24 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 font-mono text-xs outline-none focus:border-[#8b765e]"
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
              <label className="grid gap-2 text-sm font-medium">
                Base URL
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
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
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, group: event.target.value }))
                  }
                  value={form.group}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Models
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, models: event.target.value }))
                  }
                  placeholder="Comma-separated model names"
                  required
                  value={form.models}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Test model
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, testModel: event.target.value }))
                  }
                  value={form.testModel}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tag
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
                  onChange={(event) => setForm((value) => ({ ...value, tag: event.target.value }))}
                  value={form.tag}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Priority
                <input
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
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
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
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
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
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
        </Card>
      )}

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
              <p className="mt-2 text-sm text-[#655b50]">
                Showing {data.items.length} of {data.total} channels.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Channel</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Type</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Group</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Models</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Health</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Balance</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((channel) => (
                  <tr key={channel.id}>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="font-medium text-[#2d2926]">{channel.name}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        #{channel.id}
                        {channel.tag ? ` · ${channel.tag}` : ""}
                        {channel.base_url ? ` · ${channel.base_url}` : ""}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {getChannelTypeLabel(channel.type)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {channel.status === CHANNEL_STATUS_ENABLED ? (
                          <BadgeCheck className="size-4 text-[#63785f]" />
                        ) : (
                          <BadgeX className="size-4 text-[#8a4d3d]" />
                        )}
                        {getStatusLabel(channel.status)}
                      </span>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">{channel.group}</td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="max-w-72 truncate font-mono text-xs text-[#655b50]">
                        {channel.models || "None"}
                      </div>
                      {channel.test_model && (
                        <div className="mt-1 text-xs text-[#7c6e5e]">Test {channel.test_model}</div>
                      )}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>
                        {channel.response_time ? `${channel.response_time}ms` : "Not tested"}
                      </div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        {formatTime(channel.test_time)}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>${formatRawNumber(channel.balance)}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        Used {formatRawNumber(channel.used_quota)}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          aria-label="Edit channel"
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => openEditForm(channel)}
                          type="button"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          aria-label="Test channel"
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => void handleTest(channel)}
                          type="button"
                        >
                          <Gauge className="size-4" />
                        </button>
                        <button
                          aria-label="Update balance"
                          className="rounded-md px-2 text-xs font-medium text-[#5f554b] hover:bg-[#eadfce]"
                          onClick={() => void handleBalance(channel)}
                          type="button"
                        >
                          Balance
                        </button>
                        <button
                          aria-label="Copy channel"
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
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
                          className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
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
                          className="rounded-md p-2 text-[#7a4a3b] hover:bg-[#f0dfd2]"
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
