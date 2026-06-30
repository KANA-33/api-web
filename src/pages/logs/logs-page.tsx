import { useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Gauge,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import * as logsApi from "@features/logs/api";
import { usePlatformStore } from "@features/platform/store";
import type { PlatformStatus } from "@shared/api/contracts";
import { useAsyncData } from "@shared/lib/use-async-data";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { cn } from "@shared/lib/cn";
import { Card } from "@shared/ui/card";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";
import { LogDetailsView } from "./log-details-view";

const tabs = [
  { id: "usage", label: "Usage Logs" },
  { id: "drawing", label: "Drawing Logs" },
  { id: "task", label: "Task Logs" },
] as const;

type LogTabId = (typeof tabs)[number]["id"];

interface SelectedLog {
  activeTab: LogTabId;
  record: Record<string, unknown>;
}

interface LogFilters {
  keyword: string;
  modelName: string;
  status: string;
  startDate: string;
  endDate: string;
}

const emptyFilters: LogFilters = {
  keyword: "",
  modelName: "",
  status: "",
  startDate: "",
  endDate: "",
};

const logGridClass =
  "grid gap-4 xl:grid-cols-[1.15fr_0.75fr_1.35fr_1.05fr_1.5fr_1.15fr_1.35fr_1fr_1.45fr]";

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Unknown time";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function dateToTimestamp(value: string, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Math.floor(date.getTime() / 1000);
}

function getString(item: Record<string, unknown>, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = item[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function getNumber(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return 0;
}

function formatSeconds(value: number) {
  if (value <= 0) {
    return "-";
  }

  return `${(value / 1000 > 60 ? value / 1000 : value).toFixed(1)}s`;
}

function firstGlyph(value: string) {
  return value.trim().charAt(0).toUpperCase() || "U";
}

function LogCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6c6a67] xl:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}

export function LogsPage() {
  const [activeTab, setActiveTab] = useState<LogTabId>("usage");
  const [selectedLog, setSelectedLog] = useState<SelectedLog | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(emptyFilters);
  const pageSize = 50;
  const platformStatus = usePlatformStore((state) => state.status);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const start_timestamp = dateToTimestamp(appliedFilters.startDate);
    const end_timestamp = dateToTimestamp(appliedFilters.endDate, true);
    const pageQuery = { p: page, page_size: pageSize };

    if (activeTab === "drawing") {
      const response = await logsApi.getDrawingLogs({
        ...pageQuery,
        mj_id: appliedFilters.keyword || undefined,
        start_timestamp,
        end_timestamp,
      });
      return response.data;
    }

    if (activeTab === "task") {
      const response = await logsApi.getTaskLogs({
        ...pageQuery,
        task_id: appliedFilters.keyword || undefined,
        status: appliedFilters.status || undefined,
        action: appliedFilters.modelName || undefined,
        start_timestamp,
        end_timestamp,
      });
      return response.data;
    }

    const response = await logsApi.getUsageLogs({
      ...pageQuery,
      group: appliedFilters.status || undefined,
      model_name: appliedFilters.modelName || undefined,
      token_name: appliedFilters.keyword || undefined,
      start_timestamp,
      end_timestamp,
    });
    return response.data;
  }, [activeTab, page, appliedFilters]);

  function changeTab(tab: LogTabId) {
    setActiveTab(tab);
    setSelectedLog(null);
    setPage(1);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelectedLog(null);
    setPage(1);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSelectedLog(null);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const records = (data?.items ?? []) as Record<string, unknown>[];
  const usageTotal = records.reduce((sum, record) => {
    const item = record as Record<string, unknown>;
    return sum + getNumber(item, ["quota", "amount", "cost"]);
  }, 0);
  const totalTokens = records.reduce((sum, record) => {
    const item = record as Record<string, unknown>;
    return sum + getNumber(item, ["prompt_tokens"]) + getNumber(item, ["completion_tokens"]);
  }, 0);
  const avgLatency =
    records.length > 0
      ? records.reduce((sum, record) => {
          const item = record as Record<string, unknown>;
          return sum + getNumber(item, ["use_time", "duration", "elapsed"]);
        }, 0) / records.length
      : 0;

  if (selectedLog) {
    return (
      <LogDetailsView
        activeTab={selectedLog.activeTab}
        onClose={() => setSelectedLog(null)}
        platformStatus={platformStatus}
        record={selectedLog.record}
      />
    );
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-[46px] font-bold leading-none tracking-[-0.045em] md:text-[56px]">
          {tabs.find((tab) => tab.id === activeTab)?.label}
        </h2>
        <button
          className="inline-flex h-10 w-fit items-center gap-2 rounded-[2px] border border-[#d4cece] bg-[#fffdfd] px-4 text-sm font-semibold text-[#242121] hover:bg-[#efeded]"
          onClick={() => void reload()}
          type="button"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <div className="mt-9 grid gap-7 md:grid-cols-3">
        <StatPlate label="Total usage" value={formatQuota(usageTotal, platformStatus)} />
        <StatPlate label="Avg latency" value={formatSeconds(avgLatency)} />
        <StatPlate label="Tokens" value={formatRawNumber(totalTokens)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            className={cn(
              "h-10 rounded-[2px] border px-4 text-sm font-bold uppercase tracking-[0.08em]",
              activeTab === tab.id
                ? "border-black bg-black text-white"
                : "border-[#d4cece] bg-[#fffdfd] text-[#5f5958] hover:bg-[#efeded]",
            )}
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <form
          className="flex flex-col gap-4 border border-[#d8d2d2] bg-[#fbf9f9] p-5 lg:flex-row lg:items-center lg:justify-between"
          onSubmit={applyFilters}
        >
          <div className="flex flex-1 flex-wrap gap-4">
            <label className="relative w-full sm:w-[374px]">
              <CalendarDays className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#5f5958]" />
              <span className="sr-only">Start date</span>
              <input
                className="h-11 w-full rounded-[2px] border border-[#d4cece] bg-[#fffdfd] pl-12 pr-3 text-sm font-semibold text-[#3b3736] outline-none focus:border-black"
                onChange={(event) =>
                  setFilters((value) => ({ ...value, startDate: event.target.value }))
                }
                type="date"
                value={filters.startDate}
              />
            </label>
            <input
              className="h-11 w-full rounded-[2px] border border-[#d4cece] bg-[#fffdfd] px-4 text-sm font-semibold text-[#3b3736] outline-none focus:border-black sm:w-[168px]"
              onChange={(event) =>
                setFilters((value) => ({ ...value, modelName: event.target.value }))
              }
              placeholder={activeTab === "task" ? "All Actions" : "All Models"}
              value={filters.modelName}
            />
            <input
              className="h-11 w-full rounded-[2px] border border-[#d4cece] bg-[#fffdfd] px-4 text-sm font-semibold text-[#3b3736] outline-none focus:border-black sm:w-[150px]"
              onChange={(event) =>
                setFilters((value) => ({ ...value, status: event.target.value }))
              }
              placeholder={activeTab === "task" ? "All Status" : "All Groups"}
              value={filters.status}
            />
            <input
              className="h-11 w-full rounded-[2px] border border-[#d4cece] bg-[#fffdfd] px-4 text-sm font-semibold text-[#3b3736] outline-none focus:border-black sm:w-[150px]"
              onChange={(event) =>
                setFilters((value) => ({ ...value, endDate: event.target.value }))
              }
              type="date"
              value={filters.endDate}
            />
          </div>
          <div className="flex gap-2">
            <button
              className="h-11 rounded-[2px] border border-[#d4cece] bg-[#fffdfd] px-5 text-sm font-semibold text-[#3b3736] hover:bg-[#efeded]"
              onClick={clearFilters}
              type="button"
            >
              Reset
            </button>
            <button
              className="h-11 rounded-[2px] border border-black bg-black px-6 text-sm font-bold text-white hover:bg-[#303031]"
              type="submit"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div
            className={`${logGridClass} hidden border-b border-[#d8d2d2] px-5 pb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6c6a67] xl:grid`}
          >
            <span>Time</span>
            <span>Channel</span>
            <span>User</span>
            <span>Token</span>
            <span>Model</span>
            <span>Timing</span>
            <span>Tokens</span>
            <span>Cost</span>
            <span>Details</span>
          </div>

        {loading && <LoadingBlock title="Loading logs" />}

        {error && (
          <ErrorBlock
            actionLabel="Retry"
            description={error}
            onAction={() => void reload()}
            title="Logs unavailable"
          />
        )}

        {!loading && !error && records.length === 0 && (
          <EmptyBlock
            description="Records will appear here once requests or tasks are processed."
            title="No records"
          />
        )}

        {!loading && !error && records.length > 0 && (
          <div className="mt-3 space-y-3">
            {records.map((record, index) => (
              <LogRecord
                activeTab={activeTab}
                key={String((record as Record<string, unknown>).id ?? index)}
                onOpen={() =>
                  setSelectedLog({ activeTab, record: record as Record<string, unknown> })
                }
                platformStatus={platformStatus}
                record={record as Record<string, unknown>}
              />
            ))}
          </div>
        )}

          <div className="mt-7 flex flex-col gap-4 border-t border-[#d8d2d2] pt-5 text-sm font-medium text-[#5f5958] sm:flex-row sm:items-center sm:justify-end">
            <span>Total: {formatRawNumber(data?.total ?? 0)}</span>
            <span>Rows per page</span>
            <span className="grid h-9 min-w-12 place-items-center rounded-[2px] border border-[#d4cece] bg-[#fffdfd] px-3 text-[#242121]">
              {pageSize}
            </span>
            <div className="flex gap-1">
              <PagerButton disabled={page <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="size-4" />
              </PagerButton>
              <PagerButton
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="size-4" />
              </PagerButton>
              <span className="grid size-9 place-items-center rounded-[2px] bg-black text-sm font-bold text-white">
                {page}
              </span>
              <PagerButton
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                <ChevronRight className="size-4" />
              </PagerButton>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatPlate({ label, value }: { label: string; value: string }) {
  return (
    <section className="border border-[#d8d2d2] bg-[#fbf9f9] px-7 py-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#6c6a67]">{label}</p>
      <p className="mt-3 text-[34px] font-bold leading-none tracking-[-0.03em] text-black">
        {value}
      </p>
    </section>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="grid size-9 place-items-center rounded-[2px] border border-[#d4cece] bg-[#fffdfd] text-[#5f5958] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function LogRecord({
  activeTab,
  onOpen,
  platformStatus,
  record,
}: {
  activeTab: LogTabId;
  onOpen: () => void;
  platformStatus: PlatformStatus | null;
  record: Record<string, unknown>;
}) {
  const timestamp = getNumber(record, [
    "created_at",
    "submit_time",
    "created_time",
    "finish_time",
    "updated_at",
  ]);
  const channel = getNumber(record, ["channel", "channel_id"]);
  const channelName = getString(record, ["channel_name"], "");
  const username = getString(record, ["username", "user_name", "account", "user_id"], "User");
  const model = getString(record, ["model_name", "model", "action", "platform"], "Record");
  const token = getString(record, ["token_name", "token", "task_id", "mj_id"], "default");
  const group = getString(record, ["group", "platform", "status"], "default");
  const promptTokens = getNumber(record, ["prompt_tokens", "prompt_tokens_count"]);
  const completionTokens = getNumber(record, ["completion_tokens", "completion_tokens_count"]);
  const useTime = getNumber(record, ["use_time", "duration", "elapsed"]);
  const content = getString(
    record,
    ["content", "request_id", "upstream_request_id", "status"],
    "No detail",
  );
  const logType =
    activeTab === "usage" ? "Consume" : getString(record, ["status", "action"], activeTab);
  const flow =
    useTime > 0 && completionTokens > 0 ? `${Math.round(completionTokens / useTime)} t/s` : "Flow";

  return (
    <article
      className={`${logGridClass} cursor-pointer border border-[#d8d2d2] bg-[#fbf9f9] px-5 py-5 text-sm hover:bg-[#f3f1f1] focus:outline-none focus:ring-2 focus:ring-black/20`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <LogCell label="Time">
        <p className="font-bold text-[#242121]">{formatTime(timestamp)}</p>
        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#10b981]">
          <span className="size-1.5 rounded-full bg-[#10b981]" />
          {logType}
        </p>
      </LogCell>

      <LogCell label="Channel">
        <p className="font-bold text-[#f59e0b]">{channel > 0 ? `#${channel}` : "-"}</p>
        {channelName && <p className="mt-1 text-xs font-semibold text-[#6c6a67]">{channelName}</p>}
      </LogCell>

      <LogCell label="User">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#10b981] text-xs font-bold text-white">
            {firstGlyph(username)}
          </span>
          <span className="truncate font-semibold text-[#3b3736]">{username}</span>
        </div>
      </LogCell>

      <LogCell label="Token">
        <p className="flex items-center gap-1.5 font-bold text-[#3b3736]">
          <KeyRound className="size-4 text-[#6c6a67]" />
          {token}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#6c6a67]">{group}</p>
      </LogCell>

      <LogCell label="Model">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#9dc2ff] bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#2878ff]">
          <Gauge className="size-4 shrink-0" />
          <span className="truncate">{model}</span>
        </span>
      </LogCell>

      <LogCell label="Timing">
        <p className="flex flex-wrap items-center gap-2 font-bold text-[#10b981]">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[#10b981]" />
            {formatSeconds(useTime)}
          </span>
          {useTime > 0 && (
            <span className="rounded-[2px] bg-[#d1fae5] px-2 py-0.5">
              {(useTime / 2 || useTime).toFixed(1)}s
            </span>
          )}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#6c6a67]">{flow}</p>
      </LogCell>

      <LogCell label="Tokens">
        <p className="font-bold text-[#3b3736]">
          {formatRawNumber(promptTokens)} / {formatRawNumber(completionTokens)}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#6c6a67]">
          Total {formatRawNumber(promptTokens + completionTokens)}
        </p>
      </LogCell>

      <LogCell label="Cost">
        <p className="font-bold text-black">
          {formatQuota(getNumber(record, ["quota"]), platformStatus)}
        </p>
      </LogCell>

      <LogCell label="Details">
        <p className="truncate text-xs font-semibold text-[#6c6a67]">{content}</p>
      </LogCell>
    </article>
  );
}
