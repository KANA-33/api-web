import { type ReactNode } from "react";
import { ArrowLeft, Copy, Tag, X } from "lucide-react";
import type { PlatformStatus } from "@shared/api/contracts";
import { cn } from "@shared/lib/cn";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";

type LogTabId = "usage" | "drawing" | "task";

function getString(item: Record<string, unknown>, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = item[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function parseOther(record: Record<string, unknown>) {
  const other = record.other;

  if (typeof other !== "string" || other.trim() === "") {
    return {};
  }

  try {
    const parsed = JSON.parse(other) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function getStringFromSources(
  record: Record<string, unknown>,
  other: Record<string, unknown>,
  keys: string[],
  fallback = "-",
) {
  const recordValue = getString(record, keys, "");

  if (recordValue) {
    return recordValue;
  }

  return getString(other, keys, fallback);
}

function hasValueInSources(
  record: Record<string, unknown>,
  other: Record<string, unknown>,
  keys: string[],
) {
  return getStringFromSources(record, other, keys, "") !== "";
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

function getOptionalNumber(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    const numericValue = Number(value);

    if (value !== undefined && value !== null && Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
}

function formatTime(timestamp: number | null) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function formatSeconds(value: number) {
  if (value <= 0) {
    return "-";
  }

  return `${value.toFixed(1)}s`;
}

function getLogStatus(activeTab: LogTabId, record: Record<string, unknown>) {
  return activeTab === "usage" ? "Consumed" : getString(record, ["status", "action"], activeTab);
}

function getRequestPath(activeTab: LogTabId, record: Record<string, unknown>) {
  const fallback =
    activeTab === "usage" ? "/v1/messages" : activeTab === "drawing" ? "/mj/submit" : "/api/task";
  return getString(record, ["path", "request_path", "url", "endpoint"], fallback);
}

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className="space-y-4">
      {title && (
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#242121]">{title}</h3>
      )}
      {children}
    </section>
  );
}

function DetailCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border border-[#d8d2d2] bg-[#fffdfd] p-6", className)}>{children}</div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid gap-3 border-b border-[#ebe6e6] py-3 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <span className="text-sm font-medium text-[#6c6a67]">{label}</span>
      <span
        className={cn("min-w-0 break-words text-sm font-medium text-[#242121]", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
}

export function LogDetailsView({
  activeTab,
  embedded = false,
  onClose,
  platformStatus,
  record,
}: {
  activeTab: LogTabId;
  embedded?: boolean;
  onClose: () => void;
  platformStatus: PlatformStatus | null;
  record: Record<string, unknown>;
}) {
  const other = parseOther(record);
  const timestamp = getOptionalNumber(record, [
    "created_at",
    "submit_time",
    "created_time",
    "finish_time",
    "updated_at",
  ]);
  const channel = getNumber(record, ["channel", "channel_id"]);
  const channelName = getString(record, ["channel_name"], "-");
  const model = getString(record, ["model_name", "model", "action", "platform"], "-");
  const group = getString(record, ["group", "platform", "status"], "default");
  const promptTokens = getNumber(record, ["prompt_tokens", "prompt_tokens_count"]);
  const completionTokens = getNumber(record, ["completion_tokens", "completion_tokens_count"]);
  const useTime = getNumber(record, ["use_time", "duration", "elapsed"]);
  const quota = getNumber(record, ["quota", "amount", "cost"]);
  const logId = getString(record, ["id"], "-");
  const requestId = getString(record, ["request_id", "task_id", "mj_id"], "-");
  const upstreamRequestId = getString(record, ["upstream_request_id"], "-");
  const token = getString(record, ["token_name", "token", "task_id", "mj_id"], "-");
  const retryCount = getOptionalNumber(record, ["retry_count", "retry_times", "retry"]);
  const status = getLogStatus(activeTab, record);
  const path = getRequestPath(activeTab, record);
  const rawBillingMode = getStringFromSources(record, other, ["billing_mode", "mode"], "");
  const hasDynamicPricing =
    rawBillingMode.toLowerCase().includes("dynamic") ||
    hasValueInSources(record, other, [
      "hit_tier",
      "tier",
      "input_rate",
      "prompt_rate",
      "output_rate",
      "completion_rate",
      "multiplier",
      "group_multiplier",
    ]);
  const billingMode = rawBillingMode || (hasDynamicPricing ? "Dynamic" : "Token Billing");
  const hitTier = getStringFromSources(record, other, ["hit_tier", "tier"], "-");
  const inputRate = getStringFromSources(record, other, ["input_rate", "prompt_rate"], "-");
  const outputRate = getStringFromSources(record, other, ["output_rate", "completion_rate"], "-");
  const multiplier = getStringFromSources(record, other, ["multiplier", "group_multiplier"], "-");
  const source = getStringFromSources(record, other, ["billing_source", "source"], "Local Billing");
  const endReason = getStringFromSources(record, other, ["end_reason", "finish_reason"], "");
  const endError = getStringFromSources(record, other, ["end_error", "error", "message"], "");
  const flowStatus =
    getStringFromSources(record, other, ["flow_status", "status"], "") ||
    (endError ? "error" : activeTab === "usage" ? "completed" : status);

  const detailContent = (
    <>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <DetailCard>
            <DetailRow label="Log ID" value={logId} />
            <DetailRow label="Request ID" value={requestId} />
            <DetailRow label="Upstream Request ID" value={upstreamRequestId} />
            <DetailRow label="Created At" value={formatTime(timestamp)} />
            <DetailRow
              label="Channel"
              value={channelName === "-" ? channel || "-" : `${channel || "-"} (${channelName})`}
            />
            <DetailRow label="Model" value={model} />
            <DetailRow label="Retry Count" value={retryCount ?? "-"} />
            <DetailRow label="Token" value={token} />
            <DetailRow label="Group" value={group} />
            <DetailRow
              label="Response Time"
              value={formatSeconds(useTime)}
              valueClassName="text-[#10b981]"
            />
          </DetailCard>

          <DetailSection title="Request Details">
            <DetailCard>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#6c6a67]">Path</p>
                  <p className="mt-2 text-base font-medium text-[#242121]">{path}</p>
                </div>
                <button
                  aria-label="Copy request path"
                  className="grid size-9 place-items-center rounded-[2px] text-[#242121] hover:bg-[#efeded]"
                  onClick={() => void navigator.clipboard?.writeText(path)}
                  type="button"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <p className="mt-6 text-sm font-medium text-[#6c6a67]">&lt;&gt; Native Format</p>
            </DetailCard>
          </DetailSection>

          <DetailSection title="Token Breakdown">
            <DetailCard>
              <DetailRow label="Input Token" value={formatRawNumber(promptTokens)} />
              <DetailRow label="Output Token" value={formatRawNumber(completionTokens)} />
            </DetailCard>
          </DetailSection>

          <DetailSection>
            <div className="border border-[#d8d2d2] bg-[#fffdfd]">
              <div className="flex items-start gap-4 border-b border-[#d8d2d2] bg-[#fbf9f9] p-6">
                <Tag className="mt-0.5 size-6 text-[#f97316]" />
                <div>
                  <h3 className="text-lg font-bold text-[#242121]">
                    {hasDynamicPricing ? "Dynamic Pricing" : "Token Billing"}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-[#6c6a67]">
                    {hasDynamicPricing
                      ? "Pricing dynamically adjusted based on usage tier and request conditions."
                      : "Usage is billed from prompt and completion token consumption."}
                  </p>
                </div>
              </div>
              {hasDynamicPricing ? (
                <div className="space-y-7 p-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#242121]">
                      Tier Price Table
                    </h4>
                    <div className="mt-4 overflow-hidden border border-[#d8d2d2]">
                      <div className="grid grid-cols-3 border-b border-[#d8d2d2] bg-[#fffdfd] px-4 py-3 text-sm font-medium text-[#5f5958]">
                        <span>Tier</span>
                        <span className="text-right">Input</span>
                        <span className="text-right">Output</span>
                      </div>
                      <div className="grid grid-cols-3 bg-[#effcf9] px-4 py-4 text-sm text-[#242121]">
                        <span>
                          <strong>{hitTier}</strong>
                          <em className="ml-2 rounded-[2px] bg-[#a7f3d0] px-2 py-1 text-[10px] not-italic text-[#047857]">
                            HIT
                          </em>
                        </span>
                        <span className="text-right">{inputRate}</span>
                        <span className="text-right">{outputRate}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#242121]">
                      Condition Multipliers
                    </h4>
                    <div className="mt-4 flex items-center justify-between border border-[#d8d2d2] bg-[#fffdfd] px-4 py-4 text-sm">
                      <span className="text-[#5f5958]">Context using_group = "{group}"</span>
                      <span className="rounded-[2px] bg-[#fff7ed] px-2 py-1 font-semibold text-[#f97316]">
                        {multiplier}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 p-6 sm:grid-cols-3">
                  <div className="border border-[#d8d2d2] bg-[#fffdfd] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c6a67]">
                      Billing Basis
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#242121]">Prompt + Completion</p>
                  </div>
                  <div className="border border-[#d8d2d2] bg-[#fffdfd] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c6a67]">
                      Total Tokens
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#242121]">
                      {formatRawNumber(promptTokens + completionTokens)}
                    </p>
                  </div>
                  <div className="border border-[#d8d2d2] bg-[#fffdfd] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c6a67]">
                      Charged Quota
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#242121]">
                      {formatQuota(quota, platformStatus)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection title="Flow Status">
            <DetailCard className={endError ? "border-[#efcaca] bg-[#fffafa]" : undefined}>
              <DetailRow
                label="Status"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-2",
                      endError ? "text-[#ef4444]" : "text-[#10b981]",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        endError ? "bg-[#ef4444]" : "bg-[#10b981]",
                      )}
                    />
                    {flowStatus}
                  </span>
                }
              />
              <DetailRow label="End Reason" value={endReason || "-"} />
              <DetailRow label="End Error" value={endError || "-"} />
            </DetailCard>
          </DetailSection>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-8 xl:self-start">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#242121]">
            Billing Summary
          </h3>
          <DetailCard className="p-6">
            <DetailRow label="Mode" value={billingMode} />
            {hasDynamicPricing ? (
              <>
                <DetailRow label="Hit Tier" value={hitTier} />
                <DetailRow label="Input Rate" value={inputRate} />
                <DetailRow label="Output Rate" value={outputRate} />
                <DetailRow label="Group Multiplier" value={multiplier} />
              </>
            ) : (
              <>
                <DetailRow label="Billing Basis" value="Prompt + Completion Tokens" />
                <DetailRow label="Input Tokens" value={formatRawNumber(promptTokens)} />
                <DetailRow label="Output Tokens" value={formatRawNumber(completionTokens)} />
              </>
            )}
            <DetailRow label="Source" value={source} />
            <div className="mt-5 border-t border-[#ebe6e6] pt-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-[#242121]">Total Cost</span>
                <span className="text-xl font-bold text-black">
                  {formatQuota(quota, platformStatus)}
                </span>
              </div>
            </div>
          </DetailCard>
        </aside>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex h-8 items-center gap-2 border border-[#d4cece] bg-[#fbf9f9] px-3 text-sm font-medium text-[#242121]">
            <span className="size-2 rounded-full bg-[#10b981]" />
            {status}
          </span>
          <span className="text-sm font-semibold text-[#6c6a67]">{formatTime(timestamp)}</span>
        </div>
        {detailContent}
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      <header className="flex items-center justify-between gap-4 border-b border-[#d8d2d2] pb-8">
        <div className="flex min-w-0 items-center gap-4">
          <button
            aria-label="Back to logs"
            className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-[#d4cece] bg-[#fffdfd] text-[#242121] hover:bg-[#efeded]"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="truncate text-[34px] font-bold leading-none tracking-[-0.045em] text-black md:text-[42px]">
            Log Details
          </h2>
          <span className="inline-flex h-8 shrink-0 items-center gap-2 border border-[#d4cece] bg-[#fbf9f9] px-3 text-sm font-medium text-[#242121]">
            <span className="size-2 rounded-full bg-[#10b981]" />
            {status}
          </span>
        </div>
        <button
          aria-label="Close log details"
          className="grid size-10 shrink-0 place-items-center rounded-[2px] text-[#242121] hover:bg-[#efeded]"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="mt-10">{detailContent}</div>
    </div>
  );
}
