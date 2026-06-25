import { useState, type FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import * as logsApi from "@features/logs/api";
import { useAsyncData } from "@shared/lib/use-async-data";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const tabs = [
  { id: "usage", label: "Usage Logs" },
  { id: "drawing", label: "Drawing Logs" },
  { id: "task", label: "Task Logs" },
] as const;

type LogTabId = (typeof tabs)[number]["id"];

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

export function LogsPage() {
  const [activeTab, setActiveTab] = useState<LogTabId>("usage");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(emptyFilters);
  const pageSize = 20;

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
      model_name: appliedFilters.modelName || undefined,
      token_name: appliedFilters.keyword || undefined,
      start_timestamp,
      end_timestamp,
    });
    return response.data;
  }, [activeTab, page, appliedFilters]);

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

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          description="Switch between usage, drawing, and task records from one quiet operational surface."
          title="Logs"
        />
        <Button className="gap-2" onClick={() => void reload()} variant="secondary">
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              className={cn(
                "h-10 rounded-md px-4 text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-[#2f3533] text-[#f8f1e7]"
                  : "bg-[#efe5d6] text-[#62584d] hover:bg-[#e5d8c5]",
              )}
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-5" onSubmit={applyFilters}>
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
            placeholder={activeTab === "drawing" ? "Task ID" : "Token or task ID"}
            value={filters.keyword}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            onChange={(event) =>
              setFilters((value) => ({ ...value, modelName: event.target.value }))
            }
            placeholder={activeTab === "task" ? "Action" : "Model"}
            value={filters.modelName}
          />
          <input
            className="h-10 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 text-sm outline-none focus:border-[#8b765e]"
            disabled={activeTab !== "task"}
            onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}
            placeholder="Task status"
            value={filters.status}
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
          <div className="flex gap-2 lg:col-span-5">
            <Button type="submit">Apply filters</Button>
            <Button onClick={clearFilters} type="button" variant="secondary">
              Clear
            </Button>
          </div>
        </form>

        <div className="mt-6">
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
            <EmptyBlock
              description="Records will appear here once requests or tasks are processed."
              title="No records"
            />
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <>
              <div className="space-y-3">
                {data.items.map((record, index) => {
                  const item = record as Record<string, unknown>;
                  const id = String(item.id ?? item.mj_id ?? item.task_id ?? index);
                  const title = String(
                    item.model_name ?? item.model ?? item.action ?? item.platform ?? "Record",
                  );
                  const timestamp = Number(
                    item.created_at ?? item.submit_time ?? item.created_time ?? item.finish_time,
                  );

                  return (
                    <div
                      className="grid gap-3 rounded-md border border-[#ddcfbd] bg-[#f7f0e8] p-4 text-sm lg:grid-cols-[1fr_auto]"
                      key={id}
                    >
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="mt-1 text-[#655b50]">
                          {String(item.content ?? item.status ?? item.progress ?? "No detail")}
                        </p>
                      </div>
                      <span className="text-[#837462]">{formatTime(timestamp)}</span>
                    </div>
                  );
                })}
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
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
