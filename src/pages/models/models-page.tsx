import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CircleGauge,
  Filter,
  GitBranch,
  Heart,
  LineChart,
  Settings,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import * as adminLogsApi from "@features/admin/logs/api";
import * as logsApi from "@features/logs/api";
import * as modelsApi from "@features/models/api";
import { useAuthStore } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import type { PlatformStatus, UsageLogRecord } from "@shared/api/contracts";
import { cn } from "@shared/lib/cn";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { isAdminUser } from "@shared/lib/roles";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Modal } from "@shared/ui/modal";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

type AnalyticsTab = "model" | "traffic" | "user";
type MetricMode = "cost" | "tokens" | "requests";
type ChartMode = "bar" | "area";
type DistributionInterval = "hour" | "day" | "week";
type TrendMode = "call" | "distribution" | "ranking";
type RangeId = "1h" | "1d" | "7d" | "14d" | "30d";

interface ModelFilterState {
  endDateTime: string;
  startDateTime: string;
  username: string;
}

interface ModelAggregate {
  avgLatency: number;
  completionTokens: number;
  latestAt: number;
  model: string;
  promptTokens: number;
  quota: number;
  requests: number;
  tokens: number;
}

interface BucketPoint {
  label: string;
  quota: number;
  requests: number;
  timestamp: number;
  tokens: number;
}

interface UserAggregate {
  quota: number;
  requests: number;
  tokens: number;
  username: string;
}

interface FlowNode {
  count: number;
  label: string;
  quota: number;
  tokens: number;
}

interface DistributionSegment {
  color: string;
  model: string;
  quota: number;
  requests: number;
  tokens: number;
}

interface DistributionBucket {
  label: string;
  segments: DistributionSegment[];
  timestamp: number;
  totalQuota: number;
  totalRequests: number;
  totalTokens: number;
}

const tabs = [
  { id: "model", label: "Model Analysis" },
  { id: "traffic", label: "Traffic Flow" },
  { id: "user", label: "User Statistics" },
] as const;

const ranges: Array<{ hours: number; id: RangeId; label: string }> = [
  { hours: 1, id: "1h", label: "1h" },
  { hours: 24, id: "1d", label: "1d" },
  { hours: 24 * 7, id: "7d", label: "7d" },
  { hours: 24 * 14, id: "14d", label: "14d" },
  { hours: 24 * 30, id: "30d", label: "30d" },
];

const topOptions = [5, 10, 20, 50];
const trafficTopOptions = [10, 20, 50, 100];
const blue = "#2f6beb";
const emptyModelFilters: ModelFilterState = {
  endDateTime: "",
  startDateTime: "",
  username: "",
};
const modelColors = [
  "#2f6beb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#64748b",
  "#ec4899",
];

function getRangeStart(rangeId: RangeId) {
  const range = ranges.find((item) => item.id === rangeId) ?? ranges[1];
  return Math.floor(Date.now() / 1000) - range.hours * 3600;
}

function getTokenTotal(record: UsageLogRecord) {
  return (record.prompt_tokens ?? 0) + (record.completion_tokens ?? 0);
}

function dateTimeToTimestamp(value: string) {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : Math.floor(timestamp / 1000);
}

function getMetricValue(
  item: { count?: number; quota: number; requests?: number; tokens: number },
  metric: MetricMode,
) {
  if (metric === "cost") {
    return item.quota;
  }

  if (metric === "tokens") {
    return item.tokens;
  }

  return item.requests ?? item.count ?? 0;
}

function formatMetricValue(value: number, metric: MetricMode, platformStatus: PlatformStatus | null) {
  if (metric === "cost") {
    return formatQuota(value, platformStatus);
  }

  return formatRawNumber(value);
}

function formatShortTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
}

function floorToInterval(timestamp: number, interval: DistributionInterval) {
  const date = new Date(timestamp * 1000);

  if (interval === "hour") {
    date.setMinutes(0, 0, 0);
    return Math.floor(date.getTime() / 1000);
  }

  date.setHours(0, 0, 0, 0);

  if (interval === "week") {
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
  }

  return Math.floor(date.getTime() / 1000);
}

function formatDistributionLabel(timestamp: number, interval: DistributionInterval) {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (interval === "hour") {
    return `${month}-${day} ${String(date.getHours()).padStart(2, "0")}:00`;
  }

  if (interval === "week") {
    return `Week of ${month}-${day}`;
  }

  return `${month}-${day}`;
}

function makeModelColorMap(logs: UsageLogRecord[]) {
  const models = Array.from(new Set(logs.map((log) => log.model_name || "Unspecified model")));
  return new Map(models.map((model, index) => [model, modelColors[index % modelColors.length]]));
}

function addInterval(timestamp: number, interval: DistributionInterval) {
  const date = new Date(timestamp * 1000);

  if (interval === "hour") {
    date.setHours(date.getHours() + 1);
  } else if (interval === "day") {
    date.setDate(date.getDate() + 1);
  } else {
    date.setDate(date.getDate() + 7);
  }

  return Math.floor(date.getTime() / 1000);
}

function subtractIntervals(timestamp: number, interval: DistributionInterval, count: number) {
  const date = new Date(timestamp * 1000);

  if (interval === "hour") {
    date.setHours(date.getHours() - count);
  } else if (interval === "day") {
    date.setDate(date.getDate() - count);
  } else {
    date.setDate(date.getDate() - count * 7);
  }

  return Math.floor(date.getTime() / 1000);
}

function getDistributionWindowStart(interval: DistributionInterval, endTimestamp: number) {
  const currentUnitStart = floorToInterval(endTimestamp, interval);
  return subtractIntervals(currentUnitStart, interval, 6);
}

function makeDistributionBuckets(
  logs: UsageLogRecord[],
  interval: DistributionInterval,
  startTimestamp: number,
  endTimestamp: number,
) {
  const colorMap = makeModelColorMap(logs);
  const bucketMap = new Map<
    number,
    {
      models: Map<string, DistributionSegment>;
      timestamp: number;
      totalQuota: number;
      totalRequests: number;
      totalTokens: number;
    }
  >();

  for (
    let timestamp = floorToInterval(startTimestamp, interval);
    timestamp <= endTimestamp;
    timestamp = addInterval(timestamp, interval)
  ) {
    bucketMap.set(timestamp, {
      models: new Map<string, DistributionSegment>(),
      timestamp,
      totalQuota: 0,
      totalRequests: 0,
      totalTokens: 0,
    });
  }

  for (const log of logs) {
    if (!log.created_at) {
      continue;
    }

    if (log.created_at < startTimestamp || log.created_at > endTimestamp) {
      continue;
    }

    const timestamp = floorToInterval(log.created_at, interval);
    const model = log.model_name || "Unspecified model";
    const bucket =
      bucketMap.get(timestamp) ??
      ({
        models: new Map<string, DistributionSegment>(),
        timestamp,
        totalQuota: 0,
        totalRequests: 0,
        totalTokens: 0,
      } satisfies {
        models: Map<string, DistributionSegment>;
        timestamp: number;
        totalQuota: number;
        totalRequests: number;
        totalTokens: number;
      });
    const existing =
      bucket.models.get(model) ??
      ({
        color: colorMap.get(model) ?? modelColors[0],
        model,
        quota: 0,
        requests: 0,
        tokens: 0,
      } satisfies DistributionSegment);

    existing.quota += log.quota ?? 0;
    existing.requests += 1;
    existing.tokens += getTokenTotal(log);
    bucket.totalQuota += log.quota ?? 0;
    bucket.totalRequests += 1;
    bucket.totalTokens += getTokenTotal(log);
    bucket.models.set(model, existing);
    bucketMap.set(timestamp, bucket);
  }

  return [...bucketMap.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((bucket) => ({
      label: formatDistributionLabel(bucket.timestamp, interval),
      segments: [...bucket.models.values()].sort((a, b) => b.quota - a.quota),
      timestamp: bucket.timestamp,
      totalQuota: bucket.totalQuota,
      totalRequests: bucket.totalRequests,
      totalTokens: bucket.totalTokens,
    }));
}

function makeBuckets(startTimestamp: number, rangeId: RangeId, logs: UsageLogRecord[]) {
  const now = Math.floor(Date.now() / 1000);
  const bucketCount = rangeId === "1h" ? 6 : rangeId === "1d" ? 8 : 10;
  const span = Math.max(1, now - startTimestamp);
  const bucketSize = Math.max(1, Math.ceil(span / bucketCount));
  const buckets: BucketPoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const timestamp = startTimestamp + index * bucketSize;
    return {
      label: formatShortTime(timestamp),
      quota: 0,
      requests: 0,
      timestamp,
      tokens: 0,
    };
  });

  for (const log of logs) {
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(((log.created_at ?? startTimestamp) - startTimestamp) / bucketSize)),
    );
    buckets[index].requests += 1;
    buckets[index].quota += log.quota ?? 0;
    buckets[index].tokens += getTokenTotal(log);
  }

  return buckets;
}

function aggregateModels(logs: UsageLogRecord[], availableModels: string[]) {
  const map = new Map<string, ModelAggregate>();

  for (const model of availableModels) {
    map.set(model, {
      avgLatency: 0,
      completionTokens: 0,
      latestAt: 0,
      model,
      promptTokens: 0,
      quota: 0,
      requests: 0,
      tokens: 0,
    });
  }

  for (const log of logs) {
    const model = log.model_name || "Unspecified model";
    const existing =
      map.get(model) ??
      ({
        avgLatency: 0,
        completionTokens: 0,
        latestAt: 0,
        model,
        promptTokens: 0,
        quota: 0,
        requests: 0,
        tokens: 0,
      } satisfies ModelAggregate);
    existing.requests += 1;
    existing.quota += log.quota ?? 0;
    existing.promptTokens += log.prompt_tokens ?? 0;
    existing.completionTokens += log.completion_tokens ?? 0;
    existing.tokens += getTokenTotal(log);
    existing.avgLatency += log.use_time ?? 0;
    existing.latestAt = Math.max(existing.latestAt, log.created_at ?? 0);
    map.set(model, existing);
  }

  return [...map.values()]
    .map((item) => ({
      ...item,
      avgLatency: item.requests > 0 ? item.avgLatency / item.requests : 0,
    }))
    .sort((a, b) => b.quota - a.quota || b.requests - a.requests);
}

function aggregateUsers(logs: UsageLogRecord[], fallbackUsername: string) {
  const map = new Map<string, UserAggregate>();

  for (const log of logs) {
    const username = log.username || fallbackUsername || "Current user";
    const existing =
      map.get(username) ??
      ({
        quota: 0,
        requests: 0,
        tokens: 0,
        username,
      } satisfies UserAggregate);
    existing.quota += log.quota ?? 0;
    existing.requests += 1;
    existing.tokens += getTokenTotal(log);
    map.set(username, existing);
  }

  return [...map.values()].sort((a, b) => b.quota - a.quota || b.requests - a.requests);
}

function aggregateFlowNodes(
  logs: UsageLogRecord[],
  fallbackUsername: string,
  dimension: "channel" | "user" | "token" | "group" | "model",
) {
  const map = new Map<string, FlowNode>();

  for (const log of logs) {
    const label = getFlowLabel(log, fallbackUsername, dimension);

    if (!label) {
      continue;
    }

    const existing =
      map.get(label) ??
      ({
        count: 0,
        label,
        quota: 0,
        tokens: 0,
      } satisfies FlowNode);
    existing.count += 1;
    existing.quota += log.quota ?? 0;
    existing.tokens += getTokenTotal(log);
    map.set(label, existing);
  }

  return [...map.values()];
}

function getFlowLabel(
  log: UsageLogRecord,
  fallbackUsername: string,
  dimension: "channel" | "user" | "token" | "group" | "model",
) {
  if (dimension === "channel") {
    if (log.channel_name) {
      return log.channel_name;
    }

    return log.channel > 0 ? `Channel #${log.channel}` : "";
  }

  if (dimension === "user") {
    return log.username || fallbackUsername || "Current user";
  }

  if (dimension === "token") {
    return log.token_name || "";
  }

  if (dimension === "group") {
    return log.group || "";
  }

  return log.model_name || "";
}

function getBestModel(models: ModelAggregate[]) {
  return models.find((item) => item.requests > 0);
}

function ChartPanel({
  action,
  children,
  title,
  total,
  icon,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  total: string;
}) {
  return (
    <section className="border border-[#d8d2d2] bg-[#fffdfd]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8d2d2] bg-[#fbf9f9] px-6 py-4">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-bold text-[#1b1c1c]">{title}</h3>
          <span className="text-sm font-semibold text-[#6c6a67]">Total: {total}</span>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Segmented<T extends string | number>({
  items,
  onChange,
  value,
}: {
  items: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <div className="inline-flex border border-[#d8d2d2] bg-[#fffdfd]">
      {items.map((item) => (
        <button
          className={cn(
            "min-h-10 border-r border-[#d8d2d2] px-5 text-sm font-semibold last:border-r-0",
            value === item.value ? "bg-black text-white" : "text-[#4c4546] hover:bg-[#efeded]",
          )}
          key={String(item.value)}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  description,
  label,
  value,
  icon,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="min-h-[156px] border border-[#d8d2d2] bg-[#fffdfd] p-6">
      <p className="flex items-center gap-2 text-sm font-bold text-[#6c6a67]">
        {icon}
        {label}
      </p>
      <strong className="mt-5 block text-[46px] font-bold leading-none tracking-[-0.04em] text-black">
        {value}
      </strong>
      <p className="mt-4 text-sm font-semibold text-[#6c6a67]">{description}</p>
    </section>
  );
}

function EmptyChart({ label = "No data for the selected range." }: { label?: string }) {
  return (
    <div className="grid min-h-[260px] place-items-center border border-dashed border-[#d8d2d2] bg-[#fbf9f9] text-sm font-semibold text-[#6c6a67]">
      {label}
    </div>
  );
}

function StackedDistributionChart({
  buckets,
  platformStatus,
}: {
  buckets: DistributionBucket[];
  platformStatus: PlatformStatus | null;
}) {
  const max = Math.max(...buckets.map((item) => item.totalQuota), 0);

  if (max <= 0) {
    return <EmptyChart />;
  }

  return (
    <div className="relative h-[328px] border-b border-[#d8d2d2]">
      <div className="absolute inset-x-0 top-0 grid h-[260px] grid-rows-4">
        {[0, 1, 2, 3].map((item) => (
          <span className="border-t border-[#efeded]" key={item} />
        ))}
      </div>
      <div className="relative flex h-[260px] items-end gap-5 px-8 pt-5">
        {buckets.map((bucket) => (
          <div className="flex min-w-0 flex-1 flex-col items-center justify-end" key={bucket.label}>
            <div
              className="flex w-full max-w-[170px] flex-col-reverse overflow-visible"
              style={{ height: `${Math.max(2, (bucket.totalQuota / max) * 230)}px` }}
            >
              {bucket.segments.map((segment) => (
                <div
                  className="group relative w-full min-h-[3px]"
                  key={segment.model}
                  style={{
                    backgroundColor: segment.color,
                    height: `${Math.max(3, (segment.quota / bucket.totalQuota) * 100)}%`,
                  }}
                >
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 border border-[#d8d2d2] bg-[#fffdfd] p-3 text-left text-xs font-semibold text-[#303031] shadow-[0_18px_40px_rgb(0_0_0_/_0.12)] group-hover:block">
                    <p className="text-sm font-bold">{segment.model}</p>
                    <p className="mt-2 text-[#6c6a67]">Time: {bucket.label}</p>
                    <p>Cost: {formatQuota(segment.quota, platformStatus)}</p>
                    <p>Requests: {formatRawNumber(segment.requests)}</p>
                    <p>Tokens: {formatRawNumber(segment.tokens)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-5 px-8 text-xs font-semibold text-[#6c6a67]">
        {buckets.map((bucket) => (
          <span className="min-w-0 flex-1 truncate text-center" key={bucket.label}>
            {bucket.label}
          </span>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-[#6c6a67]">
        {Array.from(
          new Map(
            buckets.flatMap((bucket) =>
              bucket.segments.map((segment) => [segment.model, segment.color] as const),
            ),
          ),
        ).map(([model, color]) => (
          <span className="inline-flex items-center gap-2" key={model}>
            <span className="size-3" style={{ backgroundColor: color }} />
            {model}
          </span>
        ))}
      </div>
    </div>
  );
}

function LineAreaChart({
  data,
  metric,
  platformStatus,
}: {
  data: Array<{ label: string; value: number }>;
  metric: MetricMode;
  platformStatus: PlatformStatus | null;
}) {
  const width = 900;
  const height = 260;
  const max = Math.max(...data.map((item) => item.value), 0);

  if (data.length === 0 || max <= 0) {
    return <EmptyChart />;
  }

  const points = data.map((item, index) => {
    const x = data.length === 1 ? width : (index / (data.length - 1)) * width;
    const y = height - (item.value / max) * (height - 24);
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <div>
      <svg className="h-[320px] w-full overflow-visible" viewBox={`0 0 ${width} ${height + 54}`}>
        {[0, 1, 2, 3].map((item) => (
          <line
            key={item}
            stroke="#efeded"
            strokeWidth="1"
            x1="0"
            x2={width}
            y1={(height / 4) * item}
            y2={(height / 4) * item}
          />
        ))}
        <polygon fill="rgba(47, 107, 235, 0.12)" points={area} />
        <polyline fill="none" points={line} stroke={blue} strokeLinecap="round" strokeWidth="7" />
        {points.map((point) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill={blue}
            key={point.label}
            r="3"
          >
            <title>{`${point.label}: ${formatMetricValue(point.value, metric, platformStatus)}`}</title>
          </circle>
        ))}
        {points.map((point, index) =>
          index % Math.ceil(points.length / 4) === 0 || index === points.length - 1 ? (
            <text
              fill="#6c6a67"
              fontSize="12"
              key={`label-${point.label}`}
              textAnchor="middle"
              x={point.x}
              y={height + 34}
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function getModelsFromBuckets(buckets: DistributionBucket[]) {
  return Array.from(
    new Map(
      buckets.flatMap((bucket) =>
        bucket.segments.map((segment) => [segment.model, segment.color] as const),
      ),
    ),
  ).map(([model, color]) => ({ color, model }));
}

function ModelLegend({ buckets }: { buckets: DistributionBucket[] }) {
  const models = getModelsFromBuckets(buckets);

  if (models.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-[#6c6a67]">
      {models.map((item) => (
        <span className="inline-flex items-center gap-2" key={item.model}>
          <span className="size-3" style={{ backgroundColor: item.color }} />
          {item.model}
        </span>
      ))}
    </div>
  );
}

function StackedDistributionAreaChart({
  buckets,
  platformStatus,
}: {
  buckets: DistributionBucket[];
  platformStatus: PlatformStatus | null;
}) {
  const width = 900;
  const height = 260;
  const models = getModelsFromBuckets(buckets);
  const max = Math.max(...buckets.map((bucket) => bucket.totalQuota), 0);

  if (buckets.length === 0 || max <= 0 || models.length === 0) {
    return <EmptyChart />;
  }

  const xForIndex = (index: number) =>
    buckets.length === 1 ? width / 2 : (index / (buckets.length - 1)) * width;
  const yForValue = (value: number) => height - (value / max) * (height - 24);
  const stackedPoints = models.map((model, modelIndex) => {
    const top = buckets.map((bucket, bucketIndex) => {
      const previousQuota = models.slice(0, modelIndex).reduce((sum, previousModel) => {
        const previousSegment = bucket.segments.find(
          (segment) => segment.model === previousModel.model,
        );
        return sum + (previousSegment?.quota ?? 0);
      }, 0);
      const segment = bucket.segments.find((item) => item.model === model.model);
      const quota = segment?.quota ?? 0;

      return {
        bucket,
        segment,
        value: quota,
        x: xForIndex(bucketIndex),
        y: yForValue(previousQuota + quota),
      };
    });
    const bottom = buckets.map((bucket, bucketIndex) => {
      const previousQuota = models.slice(0, modelIndex).reduce((sum, previousModel) => {
        const previousSegment = bucket.segments.find(
          (segment) => segment.model === previousModel.model,
        );
        return sum + (previousSegment?.quota ?? 0);
      }, 0);

      return {
        bucket,
        x: xForIndex(bucketIndex),
        y: yForValue(previousQuota),
      };
    });

    return { ...model, bottom, top };
  });

  return (
    <div>
      <svg className="h-[320px] w-full overflow-visible" viewBox={`0 0 ${width} ${height + 54}`}>
        {[0, 1, 2, 3].map((item) => (
          <line
            key={item}
            stroke="#efeded"
            strokeWidth="1"
            x1="0"
            x2={width}
            y1={(height / 4) * item}
            y2={(height / 4) * item}
          />
        ))}
        {stackedPoints.map((series) => {
          const topLine = series.top.map((point) => `${point.x},${point.y}`).join(" ");
          const bottomLine = [...series.bottom]
            .reverse()
            .map((point) => `${point.x},${point.y}`)
            .join(" ");

          return (
            <g key={series.model}>
              <polygon fill={series.color} opacity="0.24" points={`${topLine} ${bottomLine}`} />
              <polyline
                fill="none"
                points={topLine}
                stroke={series.color}
                strokeLinecap="round"
                strokeWidth="3"
              />
              {series.top.map((point) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill={series.color}
                  key={`${series.model}-${point.bucket.label}`}
                  r={point.value > 0 ? 4 : 0}
                >
                  <title>{`${series.model}\nTime: ${point.bucket.label}\nCost: ${formatQuota(point.value, platformStatus)}\nRequests: ${formatRawNumber(point.segment?.requests ?? 0)}\nTokens: ${formatRawNumber(point.segment?.tokens ?? 0)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {buckets.map((bucket, index) =>
          index % Math.ceil(buckets.length / 4) === 0 || index === buckets.length - 1 ? (
            <text
              fill="#6c6a67"
              fontSize="12"
              key={`label-${bucket.label}`}
              textAnchor="middle"
              x={xForIndex(index)}
              y={height + 34}
            >
              {bucket.label}
            </text>
          ) : null,
        )}
      </svg>
      <ModelLegend buckets={buckets} />
    </div>
  );
}

function ModelCallAreaChart({ buckets }: { buckets: DistributionBucket[] }) {
  const width = 900;
  const height = 260;
  const models = getModelsFromBuckets(buckets);
  const max = Math.max(...buckets.map((bucket) => bucket.totalRequests), 0);

  if (buckets.length === 0 || max <= 0 || models.length === 0) {
    return <EmptyChart />;
  }

  const modelSeries = models.map((model) => ({
    ...model,
    points: buckets.map((bucket, index) => {
      const segment = bucket.segments.find((item) => item.model === model.model);
      const value = segment?.requests ?? 0;
      const x = buckets.length === 1 ? width : (index / (buckets.length - 1)) * width;
      const y = height - (value / max) * (height - 24);
      return { bucket, value, x, y };
    }),
  }));

  return (
    <div>
      <svg className="h-[320px] w-full overflow-visible" viewBox={`0 0 ${width} ${height + 54}`}>
        {[0, 1, 2, 3].map((item) => (
          <line
            key={item}
            stroke="#efeded"
            strokeWidth="1"
            x1="0"
            x2={width}
            y1={(height / 4) * item}
            y2={(height / 4) * item}
          />
        ))}
        {modelSeries.map((series) => {
          const line = series.points.map((point) => `${point.x},${point.y}`).join(" ");
          const area = `0,${height} ${line} ${width},${height}`;

          return (
            <g key={series.model}>
              <polygon fill={series.color} opacity="0.1" points={area} />
              <polyline
                fill="none"
                points={line}
                stroke={series.color}
                strokeLinecap="round"
                strokeWidth="4"
              />
              {series.points.map((point) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill={series.color}
                  key={`${series.model}-${point.bucket.label}`}
                  r={point.value > 0 ? 4 : 0}
                >
                  <title>{`${series.model}\nTime: ${point.bucket.label}\nCalls: ${formatRawNumber(point.value)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {buckets.map((bucket, index) =>
          index % Math.ceil(buckets.length / 4) === 0 || index === buckets.length - 1 ? (
            <text
              fill="#6c6a67"
              fontSize="12"
              key={`label-${bucket.label}`}
              textAnchor="middle"
              x={buckets.length === 1 ? width : (index / (buckets.length - 1)) * width}
              y={height + 34}
            >
              {bucket.label}
            </text>
          ) : null,
        )}
      </svg>
      <ModelLegend buckets={buckets} />
    </div>
  );
}

function ModelCallPieChart({ buckets }: { buckets: DistributionBucket[] }) {
  const totals = getModelsFromBuckets(buckets)
    .map((model) => ({
      ...model,
      value: buckets.reduce(
        (sum, bucket) =>
          sum + (bucket.segments.find((segment) => segment.model === model.model)?.requests ?? 0),
        0,
      ),
    }))
    .filter((item) => item.value > 0);
  const total = totals.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return <EmptyChart />;
  }

  let offset = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
      <svg className="mx-auto size-[320px]" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#efeded" strokeWidth="18" />
        {totals.map((item) => {
          const dash = (item.value / total) * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.model}
              r={radius}
              stroke={item.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            >
              <title>{`${item.model}\nCalls: ${formatRawNumber(item.value)}\nShare: ${((item.value / total) * 100).toFixed(2)}%`}</title>
            </circle>
          );
        })}
        <text
          fill="#000"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          x="60"
          y="58"
        >
          {formatRawNumber(total)}
        </text>
        <text fill="#6c6a67" fontSize="5" textAnchor="middle" x="60" y="68">
          calls
        </text>
      </svg>
      <div className="space-y-3">
        {totals.map((item) => (
          <div
            className="flex items-center justify-between border-b border-[#efeded] py-3 text-sm font-semibold"
            key={item.model}
            title={`${item.model}: ${formatRawNumber(item.value)} calls`}
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              <span className="size-3 shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.model}</span>
            </span>
            <span>{formatRawNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelCallRankingChart({ buckets }: { buckets: DistributionBucket[] }) {
  const totals = getModelsFromBuckets(buckets)
    .map((model) => ({
      ...model,
      value: buckets.reduce(
        (sum, bucket) =>
          sum + (bucket.segments.find((segment) => segment.model === model.model)?.requests ?? 0),
        0,
      ),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...totals.map((item) => item.value), 0);

  if (max <= 0) {
    return <EmptyChart />;
  }

  return (
    <div className="space-y-5">
      {totals.map((item) => (
        <div className="grid items-center gap-4 md:grid-cols-[180px_1fr_90px]" key={item.model}>
          <span className="truncate text-sm font-semibold text-[#4c4546]">{item.model}</span>
          <div className="h-14 bg-[#eef4ff]">
            <div
              className="flex h-full items-center justify-end pr-4 text-sm font-bold text-white"
              style={{ backgroundColor: item.color, width: `${Math.max(3, (item.value / max) * 100)}%` }}
              title={`${item.model}: ${formatRawNumber(item.value)} calls`}
            >
              {formatRawNumber(item.value)}
            </div>
          </div>
          <span className="text-right text-sm font-semibold text-[#6c6a67]">
            {formatRawNumber(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function HorizontalRanking({
  data,
  metric,
  platformStatus,
}: {
  data: Array<{ label: string; value: number }>;
  metric: MetricMode;
  platformStatus: PlatformStatus | null;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);

  if (max <= 0) {
    return <EmptyChart />;
  }

  return (
    <div className="space-y-5">
      {data.map((item) => (
        <div className="grid items-center gap-4 md:grid-cols-[120px_1fr_110px]" key={item.label}>
          <span className="truncate text-sm font-semibold text-[#4c4546]">{item.label}</span>
          <div className="h-16 bg-[#eef4ff]">
            <div
              className="flex h-full items-center justify-end bg-[#4b83f1] pr-4 text-sm font-bold text-white"
              style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }}
            >
              {formatMetricValue(item.value, metric, platformStatus)}
            </div>
          </div>
          <span className="text-right text-sm font-semibold text-[#6c6a67]">
            {formatMetricValue(item.value, metric, platformStatus)}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrafficFlowDiagram({
  fallbackUsername,
  logs,
  mergeOther,
  metric,
  platformStatus,
  showTop,
}: {
  fallbackUsername: string;
  logs: UsageLogRecord[];
  mergeOther: boolean;
  metric: MetricMode;
  platformStatus: PlatformStatus | null;
  showTop: number;
}) {
  const dimensions = [
    { id: "root", label: "Root", nodes: [{ count: logs.length, label: "root", quota: 0, tokens: 0 }] },
    { id: "channel", label: "Channel", nodes: aggregateFlowNodes(logs, fallbackUsername, "channel") },
    { id: "user", label: "User", nodes: aggregateFlowNodes(logs, fallbackUsername, "user") },
    { id: "token", label: "Token", nodes: aggregateFlowNodes(logs, fallbackUsername, "token") },
    { id: "group", label: "Group", nodes: aggregateFlowNodes(logs, fallbackUsername, "group") },
    { id: "model", label: "Model", nodes: aggregateFlowNodes(logs, fallbackUsername, "model") },
  ].map((column) => ({ ...column, nodes: topFlowNodes(column.nodes, metric, showTop, mergeOther) }));

  if (logs.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px]">
        <div className="mb-7 flex justify-end gap-4 text-xs font-semibold text-[#6c6a67]">
          {dimensions.map((dimension) => (
            <span className="inline-flex items-center gap-2" key={dimension.id}>
              <span className="size-2 rounded-full bg-[#cfc4c5]" />
              {dimension.label}
            </span>
          ))}
        </div>
        <div className="relative grid min-h-[420px] grid-cols-6 gap-9">
          <div className="absolute left-9 right-9 top-[45%] h-28 -translate-y-1/2 bg-[#cfe1fb]" />
          {dimensions.map((dimension) => (
            <div className="relative z-10 flex flex-col justify-center gap-3" key={dimension.id}>
              {dimension.nodes.map((node) => {
                const value = getMetricValue(
                  { count: node.count, quota: node.quota, tokens: node.tokens },
                  metric,
                );
                return (
                  <div
                    className="border-l-[12px] border-[#2f7df1] bg-[#eef4ff] px-3 py-3 text-sm font-semibold text-[#303031]"
                    key={node.label}
                    title={`${node.label}: ${formatMetricValue(value, metric, platformStatus)}`}
                  >
                    <p className="truncate">{node.label}</p>
                    <p className="mt-1 text-xs text-[#6c6a67]">
                      {formatMetricValue(value, metric, platformStatus)}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function topFlowNodes(
  nodes: FlowNode[],
  metric: MetricMode,
  showTop: number,
  mergeOther: boolean,
) {
  const sorted = nodes
    .filter((node) => node.label.trim() !== "")
    .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric));

  if (!mergeOther || sorted.length <= showTop) {
    return sorted.slice(0, showTop);
  }

  const visible = sorted.slice(0, Math.max(1, showTop - 1));
  const rest = sorted.slice(Math.max(1, showTop - 1));

  return [
    ...visible,
    rest.reduce<FlowNode>(
      (sum, node) => ({
        count: sum.count + node.count,
        label: "Other",
        quota: sum.quota + node.quota,
        tokens: sum.tokens + node.tokens,
      }),
      { count: 0, label: "Other", quota: 0, tokens: 0 },
    ),
  ];
}

export function ModelsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("model");
  const [range, setRange] = useState<RangeId>("1d");
  const [chartMode, setChartMode] = useState<ChartMode>("bar");
  const [distributionInterval, setDistributionInterval] =
    useState<DistributionInterval>("hour");
  const [trendMode, setTrendMode] = useState<TrendMode>("call");
  const [trafficMetric, setTrafficMetric] = useState<MetricMode>("cost");
  const [trafficTop, setTrafficTop] = useState(20);
  const [mergeOther, setMergeOther] = useState(true);
  const [userTop, setUserTop] = useState(10);
  const [filters, setFilters] = useState<ModelFilterState>(emptyModelFilters);
  const [appliedFilters, setAppliedFilters] = useState<ModelFilterState>(emptyModelFilters);
  const user = useAuthStore((state) => state.user);
  const platformStatus = usePlatformStore((state) => state.status);
  const canFilterByUsername = isAdminUser(user);
  const filterStartTimestamp = dateTimeToTimestamp(appliedFilters.startDateTime);
  const filterEndTimestamp = dateTimeToTimestamp(appliedFilters.endDateTime);
  const fallbackEndTimestamp = useMemo(
    () => Math.floor(Date.now() / 1000),
    [appliedFilters.endDateTime, appliedFilters.startDateTime, distributionInterval],
  );
  const queryEndTimestamp = filterEndTimestamp ?? fallbackEndTimestamp;
  const startTimestamp = useMemo(() => getRangeStart(range), [range]);
  const distributionWindowStartTimestamp = useMemo(
    () => filterStartTimestamp ?? getDistributionWindowStart(distributionInterval, queryEndTimestamp),
    [distributionInterval, filterStartTimestamp, queryEndTimestamp],
  );
  const queryStartTimestamp = Math.min(startTimestamp, distributionWindowStartTimestamp);
  const usernameFilter = canFilterByUsername ? appliedFilters.username.trim() : "";

  const { data, error, loading, reload } = useAsyncData(async () => {
    const logsQuery = {
      end_timestamp: queryEndTimestamp,
      p: 1,
      page_size: 500,
      start_timestamp: queryStartTimestamp,
      type: 2,
    };
    const [modelsResponse, logsResponse] = await Promise.all([
      modelsApi.getUserModels(),
      usernameFilter
        ? adminLogsApi.getUsageLogs({
            ...logsQuery,
            username: usernameFilter,
          })
        : logsApi.getUsageLogs({
            ...logsQuery,
          }),
    ]);

    return {
      logs: logsResponse.data.items,
      models: modelsResponse.data,
      totalLogs: logsResponse.data.total,
    };
  }, [queryEndTimestamp, queryStartTimestamp, usernameFilter]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({
      endDateTime: filters.endDateTime,
      startDateTime: filters.startDateTime,
      username: filters.username.trim(),
    });
  }

  function resetFilters() {
    setFilters(emptyModelFilters);
    setAppliedFilters(emptyModelFilters);
  }

  const logs = data?.logs ?? [];
  const distributionWindowLogs = logs.filter(
    (log) =>
      (log.created_at ?? 0) >= distributionWindowStartTimestamp &&
      (log.created_at ?? 0) <= queryEndTimestamp,
  );
  const rangeLogs = logs.filter(
    (log) => (log.created_at ?? 0) >= startTimestamp && (log.created_at ?? 0) <= queryEndTimestamp,
  );
  const models = data?.models ?? [];
  const fallbackUsername = user?.display_name || user?.username || "Current user";
  const modelRows = useMemo(
    () => aggregateModels(distributionWindowLogs, models),
    [distributionWindowLogs, models],
  );
  const userRows = useMemo(
    () => aggregateUsers(rangeLogs, fallbackUsername),
    [rangeLogs, fallbackUsername],
  );
  const buckets = useMemo(
    () => makeBuckets(startTimestamp, range, rangeLogs),
    [rangeLogs, range, startTimestamp],
  );
  const totalRequests = distributionWindowLogs.length;
  const totalQuota = distributionWindowLogs.reduce((sum, log) => sum + (log.quota ?? 0), 0);
  const totalTokens = distributionWindowLogs.reduce((sum, log) => sum + getTokenTotal(log), 0);
  const avgLatency =
    totalRequests > 0
      ? distributionWindowLogs.reduce((sum, log) => sum + (log.use_time ?? 0), 0) /
        totalRequests
      : 0;
  const avgRpm =
    totalRequests > 0
      ? totalRequests /
        Math.max(1, (Date.now() / 1000 - distributionWindowStartTimestamp) / 60)
      : 0;
  const avgTpm =
    totalTokens > 0
      ? totalTokens /
        Math.max(1, (Date.now() / 1000 - distributionWindowStartTimestamp) / 60)
      : 0;
  const bestModel = getBestModel(modelRows);
  const successRate = totalRequests > 0 ? 100 : 0;
  const throughput =
    distributionWindowLogs.reduce((sum, log) => sum + (log.completion_tokens ?? 0), 0) /
    Math.max(1, distributionWindowLogs.reduce((sum, log) => sum + (log.use_time ?? 0), 0));
  const distributionBuckets = useMemo(
    () =>
      makeDistributionBuckets(
        distributionWindowLogs,
        distributionInterval,
        distributionWindowStartTimestamp,
        Math.floor(Date.now() / 1000),
      ),
    [distributionInterval, distributionWindowLogs, distributionWindowStartTimestamp],
  );
  const userRanking = userRows.slice(0, userTop).map((item) => ({
    label: item.username,
    value: item.quota,
  }));
  const userTotalQuota = rangeLogs.reduce((sum, log) => sum + (log.quota ?? 0), 0);
  const userTrend = buckets.map((bucket) => ({ label: bucket.label, value: bucket.quota }));

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[42px] font-bold leading-none tracking-[-0.045em] text-black md:text-[48px]">
            {activeTab === "model"
              ? "Model Call Analysis"
              : activeTab === "traffic"
                ? "Traffic Flow"
                : "User Statistics"}
          </h1>
          {activeTab === "traffic" && (
            <p className="mt-5 text-lg text-[#303031]">
              Visualize data routing and token consumption pathways.
            </p>
          )}
        </div>

        <Segmented
          items={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
          onChange={setActiveTab}
          value={activeTab}
        />
      </div>

      {loading && <LoadingBlock title="Loading analytics" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Analytics unavailable"
        />
      )}

      {!loading && !error && (
        <>
          {activeTab === "model" && (
            <ModelAnalysisView
              avgLatency={avgLatency}
              avgRpm={avgRpm}
              avgTpm={avgTpm}
              bestModel={bestModel}
              canFilterByUsername={canFilterByUsername}
              chartMode={chartMode}
              distributionBuckets={distributionBuckets}
              distributionInterval={distributionInterval}
              filters={filters}
              onApplyFilters={applyFilters}
              onChartModeChange={setChartMode}
              onDistributionIntervalChange={setDistributionInterval}
              onFilterChange={setFilters}
              onResetFilters={resetFilters}
              onTrendModeChange={setTrendMode}
              platformStatus={platformStatus}
              successRate={successRate}
              throughput={throughput}
              totalQuota={totalQuota}
              totalRequests={totalRequests}
              totalTokens={totalTokens}
              trendMode={trendMode}
            />
          )}

          {activeTab === "traffic" && (
            <TrafficView
              fallbackUsername={fallbackUsername}
              logs={distributionWindowLogs}
              mergeOther={mergeOther}
              onMergeOtherChange={setMergeOther}
              onMetricChange={setTrafficMetric}
              onTopChange={setTrafficTop}
              platformStatus={platformStatus}
              trafficMetric={trafficMetric}
              trafficTop={trafficTop}
            />
          )}

          {activeTab === "user" && (
            <UserStatsView
              onRangeChange={setRange}
              onTopChange={setUserTop}
              platformStatus={platformStatus}
              range={range}
              ranking={userRanking}
              totalQuota={userTotalQuota}
              trend={userTrend}
              userTop={userTop}
            />
          )}

          {data && data.totalLogs > logs.length && (
            <p className="text-xs font-semibold text-[#6c6a67]">
              Showing analytics from the latest {formatRawNumber(logs.length)} of{" "}
              {formatRawNumber(data.totalLogs)} matching usage records.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ModelAnalysisView({
  avgLatency,
  avgRpm,
  avgTpm,
  bestModel,
  canFilterByUsername,
  chartMode,
  distributionBuckets,
  distributionInterval,
  filters,
  onApplyFilters,
  onChartModeChange,
  onDistributionIntervalChange,
  onFilterChange,
  onResetFilters,
  onTrendModeChange,
  platformStatus,
  successRate,
  throughput,
  totalQuota,
  totalRequests,
  totalTokens,
  trendMode,
}: {
  avgLatency: number;
  avgRpm: number;
  avgTpm: number;
  bestModel?: ModelAggregate;
  canFilterByUsername: boolean;
  chartMode: ChartMode;
  distributionBuckets: DistributionBucket[];
  distributionInterval: DistributionInterval;
  filters: ModelFilterState;
  onApplyFilters: (event: React.FormEvent<HTMLFormElement>) => void;
  onChartModeChange: (mode: ChartMode) => void;
  onDistributionIntervalChange: (interval: DistributionInterval) => void;
  onFilterChange: (filters: ModelFilterState) => void;
  onResetFilters: () => void;
  onTrendModeChange: (mode: TrendMode) => void;
  platformStatus: PlatformStatus | null;
  successRate: number;
  throughput: number;
  totalQuota: number;
  totalRequests: number;
  totalTokens: number;
  trendMode: TrendMode;
}) {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  function togglePreferences() {
    setPreferencesOpen((value) => {
      const next = !value;
      if (next) {
        setFiltersOpen(false);
      }
      return next;
    });
  }

  function toggleFilters() {
    setFiltersOpen((value) => {
      const next = !value;
      if (next) {
        setPreferencesOpen(false);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <div className="relative flex justify-end gap-3">
        <button
          className="inline-flex h-11 items-center gap-2 border border-[#d8d2d2] bg-[#fffdfd] px-4 text-sm font-bold text-[#303031]"
          onClick={togglePreferences}
          type="button"
        >
          <Settings className="size-4" />
          Preferences
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 border border-[#d8d2d2] bg-[#fffdfd] px-4 text-sm font-bold text-[#303031]"
          onClick={toggleFilters}
          type="button"
        >
          <Filter className="size-4" />
          Filter
        </button>
      </div>

      <Modal
        description="Choose how consumption charts group the latest seven record units."
        onClose={() => setPreferencesOpen(false)}
        open={preferencesOpen}
        title="Consumption grouping"
      >
        <div>
          <Segmented
            items={[
              { label: "Hourly", value: "hour" },
              { label: "Daily", value: "day" },
              { label: "Weekly", value: "week" },
            ]}
            onChange={onDistributionIntervalChange}
            value={distributionInterval}
          />
          <p className="mt-4 text-sm font-semibold leading-6 text-[#6c6a67]">
            Charts show the latest 7 units for the selected grouping. Each stacked color
            represents one model in that period.
          </p>
        </div>
      </Modal>

      <Modal
        description="Limit model analysis by a custom time range. Admin users can also filter by username."
        onClose={() => setFiltersOpen(false)}
        open={filtersOpen}
        title="Model analysis filters"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            onApplyFilters(event);
            setFiltersOpen(false);
          }}
        >
          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c6a67]"
              htmlFor="model-filter-start"
            >
              Start time
            </label>
            <input
              className="mt-2 h-11 w-full border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-black"
              id="model-filter-start"
              onChange={(event) =>
                onFilterChange({ ...filters, startDateTime: event.target.value })
              }
              type="datetime-local"
              value={filters.startDateTime}
            />
          </div>

          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c6a67]"
              htmlFor="model-filter-end"
            >
              End time
            </label>
            <input
              className="mt-2 h-11 w-full border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-black"
              id="model-filter-end"
              onChange={(event) =>
                onFilterChange({ ...filters, endDateTime: event.target.value })
              }
              type="datetime-local"
              value={filters.endDateTime}
            />
          </div>

          {canFilterByUsername && (
            <div>
              <label
                className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c6a67]"
                htmlFor="model-filter-username"
              >
                Username
              </label>
              <input
                className="mt-2 h-11 w-full border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-black"
                id="model-filter-username"
                onChange={(event) => onFilterChange({ ...filters, username: event.target.value })}
                placeholder="Admin only"
                value={filters.username}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="h-10 border border-[#d8d2d2] bg-[#fffdfd] px-4 text-sm font-bold text-[#303031]"
              onClick={onResetFilters}
              type="button"
            >
              Reset
            </button>
            <button className="h-10 bg-black px-4 text-sm font-bold text-white" type="submit">
              Apply
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid gap-0 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <MetricCard
          description="Statistical count"
          icon={<span className="text-lg">#</span>}
          label="Total Requests"
          value={formatRawNumber(totalRequests)}
        />
        <MetricCard
          description="Statistical quota"
          icon={<span className="text-lg">$</span>}
          label="Total Cost"
          value={formatQuota(totalQuota, platformStatus)}
        />
        <MetricCard
          description="Token count"
          icon={<Boxes className="size-4" />}
          label="Total Tokens"
          value={formatRawNumber(totalTokens)}
        />
        <section className="min-h-[156px] border border-[#d8d2d2] bg-[#fffdfd] p-6">
          <p className="flex items-center gap-2 text-sm font-bold text-[#6c6a67]">
            <CircleGauge className="size-4" />
            Avg RPM
          </p>
          <strong className="mt-4 block text-[32px] font-bold leading-none tracking-[-0.04em]">
            {avgRpm.toFixed(2)}
          </strong>
          <p className="mt-6 flex items-center gap-2 text-sm font-bold text-[#6c6a67]">
            <Zap className="size-4" />
            Avg TPM
          </p>
          <strong className="mt-4 block text-[32px] font-bold leading-none tracking-[-0.04em]">
            {avgTpm.toFixed(2)}
          </strong>
        </section>
      </div>

      <section className="flex flex-wrap items-center gap-5 border border-[#d8d2d2] bg-[#fffdfd] px-5 py-4 text-sm font-bold text-[#4c4546]">
        <span className="inline-flex items-center gap-2">
          <Heart className="size-5" />
          Performance Health
        </span>
        <span className="h-6 w-px bg-[#d8d2d2]" />
        <span>
          Success Rate <strong className="ml-2 text-[#10b981]">{successRate.toFixed(2)}%</strong>
        </span>
        <span className="h-6 w-px bg-[#d8d2d2]" />
        <span>
          Avg Latency <strong className="ml-2 text-black">{avgLatency.toFixed(2)}s</strong>
        </span>
        <span className="h-6 w-px bg-[#d8d2d2]" />
        <span>
          Throughput <strong className="ml-2 text-black">{throughput.toFixed(2)} t/s</strong>
        </span>
        {bestModel && (
          <span className="bg-[#efeded] px-3 py-1">
            {bestModel.model} <strong className="text-[#10b981]">● active</strong>
          </span>
        )}
      </section>

      <ChartPanel
        action={
          <Segmented
            items={[
              { label: "Bar", value: "bar" },
              { label: "Area", value: "area" },
            ]}
            onChange={onChartModeChange}
            value={chartMode}
          />
        }
        icon={<BarChart3 className="size-5" />}
        title="Consumption Distribution"
        total={formatQuota(totalQuota, platformStatus)}
      >
        {chartMode === "bar" ? (
          <StackedDistributionChart
            buckets={distributionBuckets}
            platformStatus={platformStatus}
          />
        ) : (
          <StackedDistributionAreaChart
            buckets={distributionBuckets}
            platformStatus={platformStatus}
          />
        )}
      </ChartPanel>

      <ChartPanel
        action={
          <Segmented
            items={[
              { label: "Call", value: "call" },
              { label: "Distribution", value: "distribution" },
              { label: "Ranking", value: "ranking" },
            ]}
            onChange={onTrendModeChange}
            value={trendMode}
          />
        }
        icon={<TrendingUp className="size-5" />}
        title="Call Trend"
        total={formatRawNumber(totalRequests)}
      >
        {trendMode === "call" && <ModelCallAreaChart buckets={distributionBuckets} />}
        {trendMode === "distribution" && <ModelCallPieChart buckets={distributionBuckets} />}
        {trendMode === "ranking" && <ModelCallRankingChart buckets={distributionBuckets} />}
      </ChartPanel>
    </div>
  );
}

function TrafficView({
  fallbackUsername,
  logs,
  mergeOther,
  onMergeOtherChange,
  onMetricChange,
  onTopChange,
  platformStatus,
  trafficMetric,
  trafficTop,
}: {
  fallbackUsername: string;
  logs: UsageLogRecord[];
  mergeOther: boolean;
  onMergeOtherChange: (value: boolean) => void;
  onMetricChange: (metric: MetricMode) => void;
  onTopChange: (top: number) => void;
  platformStatus: PlatformStatus | null;
  trafficMetric: MetricMode;
  trafficTop: number;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-5 border border-[#d8d2d2] bg-[#fffdfd] p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Detail Level</span>
          <Segmented
            items={[
              { label: "By Cost", value: "cost" },
              { label: "By Token", value: "tokens" },
              { label: "By Request", value: "requests" },
            ]}
            onChange={onMetricChange}
            value={trafficMetric}
          />
          <span className="mx-2 h-6 w-px bg-[#d8d2d2]" />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Show Top</span>
          <Segmented
            items={trafficTopOptions.map((item) => ({ label: String(item), value: item }))}
            onChange={onTopChange}
            value={trafficTop}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Exceeding</span>
          <Segmented
            items={[
              { label: "Merge Other", value: "merge" },
              { label: "Hide", value: "hide" },
            ]}
            onChange={(value) => onMergeOtherChange(value === "merge")}
            value={mergeOther ? "merge" : "hide"}
          />
          <button className="inline-flex h-10 items-center gap-2 border border-[#d8d2d2] bg-[#fffdfd] px-5 text-sm font-semibold" type="button">
            <Filter className="size-4" />
            All Nodes
          </button>
        </div>
      </section>

      <ChartPanel
        icon={<GitBranch className="size-5" />}
        title="Traffic Flow Diagram"
        total={formatMetricValue(
          logs.reduce(
            (sum, log) =>
              sum +
              getMetricValue(
                { count: 1, quota: log.quota ?? 0, requests: 1, tokens: getTokenTotal(log) },
                trafficMetric,
              ),
            0,
          ),
          trafficMetric,
          platformStatus,
        )}
      >
        <TrafficFlowDiagram
          fallbackUsername={fallbackUsername}
          logs={logs}
          mergeOther={mergeOther}
          metric={trafficMetric}
          platformStatus={platformStatus}
          showTop={trafficTop}
        />
      </ChartPanel>
    </div>
  );
}

function UserStatsView({
  onRangeChange,
  onTopChange,
  platformStatus,
  range,
  ranking,
  totalQuota,
  trend,
  userTop,
}: {
  onRangeChange: (range: RangeId) => void;
  onTopChange: (top: number) => void;
  platformStatus: PlatformStatus | null;
  range: RangeId;
  ranking: Array<{ label: string; value: number }>;
  totalQuota: number;
  trend: Array<{ label: string; value: number }>;
  userTop: number;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-8 border-t border-[#d8d2d2] pt-8">
        <Segmented
          items={ranges.map((item) => ({ label: item.label, value: item.id }))}
          onChange={onRangeChange}
          value={range}
        />
        <span className="h-8 w-px bg-[#4c4546]" />
        <Segmented
          items={topOptions.map((item) => ({ label: `Top ${item}`, value: item }))}
          onChange={onTopChange}
          value={userTop}
        />
      </div>

      <ChartPanel
        icon={<UsersRound className="size-5" />}
        title="User Consumption Ranking"
        total={formatQuota(totalQuota, platformStatus)}
      >
        <HorizontalRanking data={ranking} metric="cost" platformStatus={platformStatus} />
      </ChartPanel>

      <ChartPanel
        icon={<LineChart className="size-5" />}
        title="User Consumption Trend"
        total={formatQuota(totalQuota, platformStatus)}
      >
        <LineAreaChart data={trend} metric="cost" platformStatus={platformStatus} />
      </ChartPanel>
    </div>
  );
}
