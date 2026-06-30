import { Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp, Zap } from "lucide-react";
import type {
  CurrentUser,
  PlatformStatus,
  UsageLogRecord,
  UsageSummary,
} from "@shared/api/contracts";
import { formatQuota, formatQuotaFixed, formatRawNumber } from "@shared/lib/quota-format";

interface AccountMetricCardsProps {
  activityEndTimestamp?: number;
  activityLogs?: UsageLogRecord[];
  activityTotal?: number;
  platformStatus: PlatformStatus | null;
  summary?: UsageSummary | null;
  summaryLoading?: boolean;
  user: CurrentUser | null | undefined;
}

const cardClass =
  "console-panel min-h-[252px] rounded-xl border border-[#d7cec6]/82 bg-[#fffdf8]/82 p-6 text-[#181614] shadow-[0_18px_42px_rgb(74_58_42_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.62)] backdrop-blur-md";

interface ActivityBucket {
  count: number;
  label: string;
  quota: number;
  timestamp: number;
}

function makeHourlyActivityBuckets(logs: UsageLogRecord[], endTimestamp?: number) {
  const end = endTimestamp ?? Math.floor(Date.now() / 1000);
  const endHour = Math.floor(end / 3600) * 3600;
  const startHour = endHour - 23 * 3600;
  const buckets: ActivityBucket[] = Array.from({ length: 24 }, (_, index) => {
    const timestamp = startHour + index * 3600;
    const date = new Date(timestamp * 1000);

    return {
      count: 0,
      label: `${String(date.getHours()).padStart(2, "0")}:00`,
      quota: 0,
      timestamp,
    };
  });

  for (const log of logs) {
    if (!log.created_at || log.created_at < startHour || log.created_at > end) {
      continue;
    }

    const index = Math.floor((Math.floor(log.created_at / 3600) * 3600 - startHour) / 3600);
    if (index >= 0 && index < buckets.length) {
      buckets[index].count += 1;
      buckets[index].quota += log.quota ?? 0;
    }
  }

  return buckets;
}

function ConsumptionSparkline({
  buckets,
  platformStatus,
}: {
  buckets: ActivityBucket[];
  platformStatus: PlatformStatus | null;
}) {
  const width = 308;
  const height = 66;
  const max = Math.max(...buckets.map((bucket) => bucket.quota), 0);
  const points = buckets.map((bucket, index) => {
    const x = buckets.length === 1 ? width / 2 : (index / (buckets.length - 1)) * width;
    const y = max > 0 ? height - (bucket.quota / max) * 50 - 8 : height - 8;
    return { ...bucket, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${points[0]?.x ?? 0},${height} ${line} ${points[points.length - 1]?.x ?? width},${height}`;

  return (
    <div className="mt-8">
      <svg className="h-20 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <line stroke="#d7cec6" strokeWidth="1" x1="0" x2={width} y1={height - 8} y2={height - 8} />
        <polygon fill="rgb(33 29 25 / 0.08)" points={area} />
        <polyline fill="none" points={line} stroke="#242121" strokeLinecap="round" strokeWidth="2.5" />
        {points.map((point) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill="#242121"
            key={point.timestamp}
            r={point.quota > 0 ? 2.6 : 0}
          >
            <title>{`${point.label}: ${formatQuota(point.quota, platformStatus)} · ${formatRawNumber(point.count)} request(s)`}</title>
          </circle>
        ))}
        {points.map((point, index) =>
          index % 8 === 0 || index === points.length - 1 ? (
            <text fill="#74695f" fontSize="9" key={`label-${point.timestamp}`} textAnchor="middle" x={point.x} y={height + 10}>
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function RequestBarChart({ buckets }: { buckets: ActivityBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 0);

  return (
    <div className="mt-8 flex h-20 items-end gap-1 border-b border-[#d7cec6] px-1">
      {buckets.map((bucket) => (
        <div
          className="group relative flex min-w-0 flex-1 items-end"
          key={bucket.timestamp}
          title={`${bucket.label}: ${formatRawNumber(bucket.count)} request(s)`}
        >
          <div
            className="w-full rounded-t-[2px] border border-[#d7cec6] bg-[#f1ede8] transition-colors group-hover:bg-[#211d19]"
            style={{ height: `${max > 0 ? Math.max(6, (bucket.count / max) * 68) : 6}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export function AccountMetricCards({
  activityEndTimestamp,
  activityLogs = [],
  activityTotal,
  platformStatus,
  summary,
  summaryLoading = false,
  user,
}: AccountMetricCardsProps) {
  const currentBalance = Math.max((user?.quota ?? 0) - (user?.used_quota ?? 0), 0);
  const activityBuckets = makeHourlyActivityBuckets(activityLogs, activityEndTimestamp);
  const requestCount = activityTotal ?? activityLogs.length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className={`${cardClass} bg-[#f6f3ed]/86`}>
        <div className="flex items-start justify-between gap-4">
          <p className="text-base font-medium tracking-[0.04em] text-[#3d3833]">
            Current Balance
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#23874d]">
            <span className="size-2.5 rounded-full bg-[#23874d]" />
            Healthy
          </span>
        </div>
        <strong className="mt-5 block text-[42px] font-semibold leading-none tracking-[-0.05em] text-[#090909] md:text-[48px]">
          {formatQuotaFixed(currentBalance, platformStatus)}
        </strong>
        <Link
          className="mt-11 inline-flex h-15 w-full items-center justify-between rounded-[2px] bg-white px-6 text-base font-bold text-white transition-all hover:bg-[#2b2621] active:translate-y-px"
          to="/wallet"
        >
          Wallet
          <ArrowRight className="size-6" />
        </Link>
      </section>

      <section className={cardClass}>
        <p className="flex items-center gap-3 text-base font-medium tracking-[0.04em] text-[#3d3833]">
          <TrendingUp className="size-5" />
          Last 24h Consumption
        </p>
        <strong className="mt-5 block text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#090909]">
          {summaryLoading ? "..." : formatQuota(summary?.quota, platformStatus)}
        </strong>
        <p className="mt-4 text-base text-[#5e5751]">Total spend</p>
        <ConsumptionSparkline buckets={activityBuckets} platformStatus={platformStatus} />
      </section>

      <section className={cardClass}>
        <p className="flex items-center gap-3 text-base font-medium tracking-[0.04em] text-[#3d3833]">
          <Zap className="size-5" />
          Request Count
        </p>
        <strong className="mt-5 block text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#090909]">
          {formatRawNumber(requestCount)}
        </strong>
        <p className="mt-4 text-base text-[#5e5751]">Total requests (24h)</p>
        <RequestBarChart buckets={activityBuckets} />
      </section>
    </div>
  );
}
