import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  Brush,
  ClipboardList,
  Database,
  FileSearch,
  Gauge,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import * as adminLogsApi from "@features/admin/logs/api";
import type {
  AdminDrawingLog,
  AdminTaskLog,
  FlowQuotaDataPoint,
  QuotaDataPoint,
} from "@features/admin/logs/api";
import { usePlatformStore } from "@features/platform/store";
import type { UsageLogRecord } from "@shared/api/contracts";
import { cn } from "@shared/lib/cn";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const pageSize = 20;

const tabs = [
  { id: "usage", label: "Usage logs", icon: Activity },
  { id: "audit", label: "Audit logs", icon: ShieldCheck },
  { id: "drawing", label: "Drawing logs", icon: Brush },
  { id: "task", label: "Task logs", icon: ClipboardList },
] as const;

type LogTabId = (typeof tabs)[number]["id"];

interface LogFilters {
  action: string;
  channelId: string;
  endDate: string;
  group: string;
  keyword: string;
  modelName: string;
  platform: string;
  requestId: string;
  startDate: string;
  status: string;
  type: string;
  username: string;
}

const emptyFilters: LogFilters = {
  action: "",
  channelId: "",
  endDate: "",
  group: "",
  keyword: "",
  modelName: "",
  platform: "",
  requestId: "",
  startDate: "",
  status: "",
  type: "",
  username: "",
};

function getDefaultDataRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
}

function dateToTimestamp(value: string, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Math.floor(date.getTime() / 1000);
}

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Unknown";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function parseJsonObject(value?: string) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getNestedObject(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function getLogTypeLabel(type?: number) {
  switch (type) {
    case 1:
      return "Top-up";
    case 2:
      return "Consume";
    case 3:
      return "Manage";
    case 4:
      return "System";
    case 5:
      return "Error";
    case 6:
      return "Refund";
    case 7:
      return "Login";
    default:
      return "All";
  }
}

function renderUsageTable(
  items: UsageLogRecord[],
  platformStatus: ReturnType<typeof usePlatformStore.getState>["status"],
) {
  return (
    <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
      <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
        <tr>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Request</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">User</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Model</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Quota</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Tokens</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Channel</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Time</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.request_id || item.id}-${item.created_at}`}>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div className="font-medium">{getLogTypeLabel(item.type)}</div>
              <div className="mt-1 max-w-80 truncate text-xs text-[#7c6e5e]">
                {item.content || item.request_id || "No detail"}
              </div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div>{item.username || `User #${item.user_id}`}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">{item.group || "default"}</div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4 font-mono text-xs">
              {item.model_name || "N/A"}
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              {formatQuota(item.quota, platformStatus)}
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div>{formatRawNumber(item.prompt_tokens + item.completion_tokens)}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">{item.use_time}ms</div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div>{item.channel_name || `#${item.channel}`}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">{item.token_name || "No token"}</div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">{formatTime(item.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderAuditTable(items: UsageLogRecord[]) {
  return (
    <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
      <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
        <tr>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Action</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Target</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Operator</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Route</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">IP</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Time</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const other = parseJsonObject(item.other);
          const op = getNestedObject(other, "op");
          const params = getNestedObject(op, "params");
          const adminInfo = getNestedObject(other, "admin_info");
          const auditInfo = getNestedObject(other, "audit_info");
          const action = formatAuditValue(op.action);
          const route = [auditInfo.method, auditInfo.path].filter(Boolean).join(" ");

          return (
            <tr key={`${item.id}-${item.created_at}-${item.request_id}`}>
              <td className="border-b border-[#eadfce] py-4 pr-4">
                <div className="font-medium text-[#2d2926]">{action}</div>
                <div className="mt-1 max-w-96 truncate text-xs text-[#7c6e5e]">
                  {item.content || "No content"}
                </div>
              </td>
              <td className="border-b border-[#eadfce] py-4 pr-4">
                <div>{item.username || `User #${item.user_id}`}</div>
                <div className="mt-1 max-w-80 truncate font-mono text-xs text-[#7c6e5e]">
                  {Object.keys(params).length > 0 ? JSON.stringify(params) : "No params"}
                </div>
              </td>
              <td className="border-b border-[#eadfce] py-4 pr-4">
                <div>{formatAuditValue(adminInfo.admin_username)}</div>
                <div className="mt-1 text-xs text-[#7c6e5e]">
                  Role {formatAuditValue(adminInfo.admin_role)} ·{" "}
                  {formatAuditValue(adminInfo.auth_method)}
                </div>
              </td>
              <td className="border-b border-[#eadfce] py-4 pr-4">
                <div className="font-mono text-xs">{route || "Handler audit"}</div>
                <div className="mt-1 max-w-80 truncate font-mono text-xs text-[#7c6e5e]">
                  {item.request_id || "No request id"}
                </div>
              </td>
              <td className="border-b border-[#eadfce] py-4 pr-4">{item.ip || "Hidden"}</td>
              <td className="border-b border-[#eadfce] py-4 pr-4">{formatTime(item.created_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderDrawingTable(
  items: AdminDrawingLog[],
  platformStatus: ReturnType<typeof usePlatformStore.getState>["status"],
) {
  return (
    <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
      <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
        <tr>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Task</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Prompt</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Quota</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Channel</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Submitted</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.id}-${item.mj_id}`}>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div className="font-medium">{item.action || "Draw"}</div>
              <div className="mt-1 font-mono text-xs text-[#7c6e5e]">
                {item.mj_id || `#${item.id}`}
              </div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div className="max-w-96 truncate">
                {item.prompt || item.prompt_en || "No prompt"}
              </div>
              {item.fail_reason && (
                <div className="mt-1 text-xs text-[#8a4d3d]">{item.fail_reason}</div>
              )}
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div>{item.status || "Unknown"}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">{item.progress || "0%"}</div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              {formatQuota(item.quota, platformStatus)}
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">#{item.channel_id}</td>
            <td className="border-b border-[#eadfce] py-4 pr-4">{formatTime(item.submit_time)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderTaskTable(
  items: AdminTaskLog[],
  platformStatus: ReturnType<typeof usePlatformStore.getState>["status"],
) {
  return (
    <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
      <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
        <tr>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Task</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">User</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Action</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Quota</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Channel</th>
          <th className="border-b border-[#ddcfbd] py-3 pr-4">Submitted</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.id}-${item.task_id}`}>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div className="font-mono text-xs font-medium">{item.task_id || `#${item.id}`}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">
                {item.platform || "Unknown platform"}
              </div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div>{item.username || `User #${item.user_id}`}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">{item.group || "default"}</div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">{item.action || "N/A"}</td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              <div>{item.status || "Unknown"}</div>
              <div className="mt-1 text-xs text-[#7c6e5e]">{item.progress || "0%"}</div>
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">
              {formatQuota(item.quota, platformStatus)}
            </td>
            <td className="border-b border-[#eadfce] py-4 pr-4">#{item.channel_id}</td>
            <td className="border-b border-[#eadfce] py-4 pr-4">{formatTime(item.submit_time)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AdminLogsPage() {
  const platformStatus = usePlatformStore((state) => state.status);
  const [activeTab, setActiveTab] = useState<LogTabId>("usage");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(emptyFilters);
  const defaultDataRange = useMemo(() => getDefaultDataRange(), []);
  const [dataMode, setDataMode] = useState<"flow" | "model" | "user">("model");
  const [dataStartDate, setDataStartDate] = useState(defaultDataRange.startDate);
  const [dataEndDate, setDataEndDate] = useState(defaultDataRange.endDate);
  const [dataUsername, setDataUsername] = useState("");
  const [dataQuery, setDataQuery] = useState({
    endDate: defaultDataRange.endDate,
    startDate: defaultDataRange.startDate,
    username: "",
  });

  const start_timestamp = dateToTimestamp(appliedFilters.startDate);
  const end_timestamp = dateToTimestamp(appliedFilters.endDate, true);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const pageQuery = { p: page, page_size: pageSize };

    if (activeTab === "drawing") {
      const response = await adminLogsApi.getDrawingLogs({
        ...pageQuery,
        channel_id: appliedFilters.channelId || undefined,
        end_timestamp,
        mj_id: appliedFilters.keyword || undefined,
        start_timestamp,
      });
      return response.data;
    }

    if (activeTab === "task") {
      const response = await adminLogsApi.getTaskLogs({
        ...pageQuery,
        action: appliedFilters.action || undefined,
        channel_id: appliedFilters.channelId || undefined,
        end_timestamp,
        platform: appliedFilters.platform || undefined,
        start_timestamp,
        status: appliedFilters.status || undefined,
        task_id: appliedFilters.keyword || undefined,
      });
      return response.data;
    }

    const response = await adminLogsApi.getUsageLogs({
      ...pageQuery,
      channel: appliedFilters.channelId ? Number(appliedFilters.channelId) : undefined,
      end_timestamp,
      group: appliedFilters.group || undefined,
      model_name: activeTab === "usage" ? appliedFilters.modelName || undefined : undefined,
      request_id: appliedFilters.requestId || undefined,
      start_timestamp,
      token_name: activeTab === "usage" ? appliedFilters.keyword || undefined : undefined,
      type:
        activeTab === "audit" ? 3 : appliedFilters.type ? Number(appliedFilters.type) : undefined,
      username: appliedFilters.username || undefined,
    });
    return response.data;
  }, [activeTab, page, appliedFilters]);

  const {
    data: stat,
    error: statError,
    loading: statLoading,
    reload: reloadStat,
  } = useAsyncData(async () => {
    const response = await adminLogsApi.getUsageStat({
      channel: appliedFilters.channelId ? Number(appliedFilters.channelId) : undefined,
      end_timestamp,
      group: appliedFilters.group || undefined,
      model_name: activeTab === "usage" ? appliedFilters.modelName || undefined : undefined,
      start_timestamp,
      token_name: activeTab === "usage" ? appliedFilters.keyword || undefined : undefined,
      type:
        activeTab === "audit" ? 3 : appliedFilters.type ? Number(appliedFilters.type) : undefined,
      username: appliedFilters.username || undefined,
    });
    return response.data;
  }, [activeTab, appliedFilters]);

  const {
    data: quotaData,
    error: quotaDataError,
    loading: quotaDataLoading,
    reload: reloadQuotaData,
  } = useAsyncData(async () => {
    const start = dateToTimestamp(dataQuery.startDate);
    const end = dateToTimestamp(dataQuery.endDate, true);
    if (!start || !end) {
      return [];
    }

    const query = {
      end_timestamp: end,
      start_timestamp: start,
      username: dataQuery.username || undefined,
    };
    const response =
      dataMode === "flow"
        ? await adminLogsApi.getAdminFlowQuotaData(query)
        : dataMode === "user"
          ? await adminLogsApi.getAdminQuotaDataByUser(query)
          : await adminLogsApi.getAdminQuotaData(query);

    return response.data;
  }, [dataMode, dataQuery]);

  const quotaSummary = useMemo(() => {
    const rows = quotaData ?? [];
    return rows.reduce(
      (summary, row) => ({
        count: summary.count + Number(row.count ?? 0),
        quota: summary.quota + Number(row.quota ?? 0),
        tokenUsed: summary.tokenUsed + Number(row.token_used ?? 0),
      }),
      { count: 0, quota: 0, tokenUsed: 0 },
    );
  }, [quotaData]);

  function changeTab(tab: LogTabId) {
    setActiveTab(tab);
    setPage(1);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  }

  function applyDataQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDataQuery({
      endDate: dataEndDate,
      startDate: dataStartDate,
      username: dataUsername.trim(),
    });
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const quotaRows = (quotaData ?? []).slice(0, 8);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="Inspect usage, drawing, and asynchronous task records across the whole platform."
          title="Logs"
        />
        <Button
          className="gap-2"
          onClick={() => {
            void reload();
            void reloadStat();
            void reloadQuotaData();
          }}
          variant="secondary"
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Usage quota",
            value: statLoading ? "..." : formatQuota(stat?.quota, platformStatus),
          },
          { label: "RPM", value: statLoading ? "..." : formatRawNumber(stat?.rpm) },
          { label: "TPM", value: statLoading ? "..." : formatRawNumber(stat?.tpm) },
        ].map((item) => (
          <Card className="min-h-28" key={item.label}>
            <p className="text-sm text-[#837462]">{item.label}</p>
            <strong className="mt-3 block text-3xl font-semibold">{item.value}</strong>
          </Card>
        ))}
      </div>
      {statError && <p className="text-sm text-[#8a4d3d]">{statError}</p>}

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#655b50]">
              <Database className="size-4" />
              Admin data dashboard
            </div>
            <h2 className="mt-3 text-xl font-semibold">Quota and flow</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "model", label: "By model" },
              { id: "user", label: "By user" },
              { id: "flow", label: "Flow" },
            ].map((item) => (
              <button
                className={cn(
                  "h-10 rounded-md px-4 text-sm transition-colors",
                  dataMode === item.id
                    ? "bg-[#2f3533] text-[#f8f1e7]"
                    : "bg-[#efe5d6] text-[#62584d] hover:bg-[#e5d8c5]",
                )}
                key={item.id}
                onClick={() => setDataMode(item.id as "flow" | "model" | "user")}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={applyDataQuery}>
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setDataStartDate(event.target.value)}
            type="date"
            value={dataStartDate}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setDataEndDate(event.target.value)}
            type="date"
            value={dataEndDate}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setDataUsername(event.target.value)}
            placeholder="Username filter"
            value={dataUsername}
          />
          <Button className="gap-2" type="submit">
            <Gauge className="size-4" />
            Apply
          </Button>
        </form>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[#eadfce] bg-[#fbf6ee] p-4">
            <p className="text-sm text-[#837462]">Quota</p>
            <strong className="mt-2 block text-2xl">
              {formatQuota(quotaSummary.quota, platformStatus)}
            </strong>
          </div>
          <div className="rounded-md border border-[#eadfce] bg-[#fbf6ee] p-4">
            <p className="text-sm text-[#837462]">Tokens</p>
            <strong className="mt-2 block text-2xl">
              {formatRawNumber(quotaSummary.tokenUsed)}
            </strong>
          </div>
          <div className="rounded-md border border-[#eadfce] bg-[#fbf6ee] p-4">
            <p className="text-sm text-[#837462]">Requests</p>
            <strong className="mt-2 block text-2xl">{formatRawNumber(quotaSummary.count)}</strong>
          </div>
        </div>
        {quotaDataError && <p className="mt-4 text-sm text-[#8a4d3d]">{quotaDataError}</p>}
        {quotaDataLoading ? (
          <p className="mt-5 text-sm text-[#655b50]">Loading data dashboard...</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Dimension</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">User</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Group</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Quota</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Tokens</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Requests</th>
                </tr>
              </thead>
              <tbody>
                {quotaRows.map((row: FlowQuotaDataPoint | QuotaDataPoint, index) => (
                  <tr key={`${row.model_name ?? row.username ?? row.use_group ?? "row"}-${index}`}>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>{row.model_name || row.node_name || "N/A"}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        {"channel_name" in row && row.channel_name
                          ? row.channel_name
                          : row.channel_id
                            ? `Channel #${row.channel_id}`
                            : "Platform"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {row.username || (row.user_id ? `User #${row.user_id}` : "All users")}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {row.use_group || "default"}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatQuota(row.quota, platformStatus)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatRawNumber(row.token_used)}
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      {formatRawNumber(row.count)}
                    </td>
                  </tr>
                ))}
                {quotaRows.length === 0 && (
                  <tr>
                    <td className="py-5 text-sm text-[#655b50]" colSpan={6}>
                      No data for the selected range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-[#2f3533] text-[#f8f1e7]"
                    : "bg-[#efe5d6] text-[#62584d] hover:bg-[#e5d8c5]",
                )}
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                type="button"
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-6" onSubmit={applyFilters}>
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab === "audit"}
            onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
            placeholder={
              activeTab === "usage"
                ? "Token name"
                : activeTab === "audit"
                  ? "Use Request ID below"
                  : activeTab === "drawing"
                    ? "MJ ID"
                    : "Task ID"
            }
            value={filters.keyword}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "usage" && activeTab !== "audit"}
            onChange={(event) =>
              setFilters((value) => ({ ...value, username: event.target.value }))
            }
            placeholder="Username"
            value={filters.username}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "usage"}
            onChange={(event) =>
              setFilters((value) => ({ ...value, modelName: event.target.value }))
            }
            placeholder="Model"
            value={filters.modelName}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) =>
              setFilters((value) => ({ ...value, channelId: event.target.value }))
            }
            placeholder="Channel ID"
            type="number"
            value={filters.channelId}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) =>
              setFilters((value) => ({ ...value, startDate: event.target.value }))
            }
            type="date"
            value={filters.startDate}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setFilters((value) => ({ ...value, endDate: event.target.value }))}
            type="date"
            value={filters.endDate}
          />

          <select
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "usage"}
            onChange={(event) => setFilters((value) => ({ ...value, type: event.target.value }))}
            value={filters.type}
          >
            <option value="">Any log type</option>
            <option value={1}>Top-up</option>
            <option value={2}>Consume</option>
            <option value={3}>Manage</option>
            <option value={4}>System</option>
            <option value={5}>Error</option>
            <option value={6}>Refund</option>
            <option value={7}>Login</option>
          </select>
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "usage" && activeTab !== "audit"}
            onChange={(event) => setFilters((value) => ({ ...value, group: event.target.value }))}
            placeholder="Group"
            value={filters.group}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "usage" && activeTab !== "audit"}
            onChange={(event) =>
              setFilters((value) => ({ ...value, requestId: event.target.value }))
            }
            placeholder="Request ID"
            value={filters.requestId}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "task"}
            onChange={(event) =>
              setFilters((value) => ({ ...value, platform: event.target.value }))
            }
            placeholder="Platform"
            value={filters.platform}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "task"}
            onChange={(event) => setFilters((value) => ({ ...value, action: event.target.value }))}
            placeholder="Action"
            value={filters.action}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "task"}
            onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}
            placeholder="Task status"
            value={filters.status}
          />
          <div className="flex gap-2 lg:col-span-6">
            <Button type="submit">Apply filters</Button>
            <Button onClick={clearFilters} type="button" variant="secondary">
              Clear
            </Button>
          </div>
        </form>
      </Card>

      {loading && <LoadingBlock title="Loading logs" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Logs unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock description="No records match the current filters." title="No log records" />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h2>
              <p className="mt-2 text-sm text-[#655b50]">
                Showing {data.items.length} of {data.total} records.
              </p>
            </div>
            <FileSearch className="size-6 text-[#8b765e]" />
          </div>

          <div className="mt-6 overflow-x-auto">
            {activeTab === "usage" &&
              renderUsageTable(data.items as UsageLogRecord[], platformStatus)}
            {activeTab === "audit" && renderAuditTable(data.items as UsageLogRecord[])}
            {activeTab === "drawing" &&
              renderDrawingTable(data.items as AdminDrawingLog[], platformStatus)}
            {activeTab === "task" && renderTaskTable(data.items as AdminTaskLog[], platformStatus)}
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
