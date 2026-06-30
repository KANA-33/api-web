import { Link } from "@tanstack/react-router";
import { Bell, GitFork, Megaphone, ServerCog } from "lucide-react";
import * as logsApi from "@features/logs/api";
import * as overviewApi from "@features/overview/api";
import { useAuthStore } from "@features/auth/store";
import { useAsyncData } from "@shared/lib/use-async-data";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";
import { AccountMetricCards } from "@pages/wallet/account-metric-cards";

const tileClass =
  "console-panel min-h-[304px] rounded-xl border border-[#d7cec6]/82 bg-[#fffdf8]/82 p-6 text-[#181614] shadow-[0_18px_42px_rgb(74_58_42_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.62)] backdrop-blur-md";

function getLast24hSummaryQuery() {
  const end_timestamp = Math.floor(Date.now() / 1000);
  return {
    end_timestamp,
    start_timestamp: end_timestamp - 24 * 60 * 60,
  };
}

function readableItems(value: unknown) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(record.title ?? record.name ?? record.content ?? record.message ?? "");
        }

        return "";
      })
      .filter((item) => item.trim() !== "");
  }

  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        if (typeof item === "string") {
          return item;
        }

        return key;
      })
      .filter((item) => item.trim() !== "");
  }

  return [];
}

function formatStartTime(startTime?: number) {
  if (!startTime) {
    return "Not reported";
  }

  return new Date(startTime * 1000).toLocaleString();
}

export function OverviewPage() {
  const user = useAuthStore((state) => state.user);
  const { data, error, loading, reload } = useAsyncData(async () => {
    const last24hRange = getLast24hSummaryQuery();
    const [status, summary, usageLogs] = await Promise.all([
      overviewApi.getPlatformStatus(),
      overviewApi.getUsageSummary(last24hRange),
      logsApi.getUsageLogs({
        ...last24hRange,
        p: 1,
        page_size: 500,
      }),
    ]);

    return {
      status: status.data,
      summary: summary.data,
      usageLogs: usageLogs.data,
      usageRange: last24hRange,
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <LoadingBlock title="Loading overview" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <ErrorBlock
          actionLabel="Retry"
          description={error ?? "Overview data could not be loaded."}
          onAction={() => void reload()}
          title="Overview unavailable"
        />
      </div>
    );
  }

  const apiItems = readableItems(data.status.api_info);
  const announcementItems = readableItems(data.status.announcements);

  return (
    <div className="space-y-10 pb-24 lg:pb-0">
      <div className="flex items-center justify-end gap-4">
        <button
          aria-label="Refresh overview"
          className="grid size-11 place-items-center rounded-xl border border-[#ddd4ca]/88 bg-[#fffaf4]/78 text-[#4a433d] shadow-[0_10px_28px_rgb(74_58_42_/_0.07)] transition-all hover:bg-[#f2ede7] active:translate-y-px"
          onClick={() => void reload()}
          type="button"
        >
          <Bell className="size-5" />
        </button>
      </div>

      <AccountMetricCards
        activityEndTimestamp={data.usageRange.end_timestamp}
        activityLogs={data.usageLogs.items}
        activityTotal={data.usageLogs.total}
        platformStatus={data.status}
        summary={data.summary}
        user={user}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={tileClass}>
          <h2 className="flex items-center gap-3 text-[0.95rem] font-semibold tracking-[0.01em]">
            <GitFork className="size-5" />
            API Information
          </h2>

          <div className="mt-16 text-center">
            <GitFork className="mx-auto size-12 text-[#d8d2d2]" />
            {data.status.api_info_enabled && apiItems.length > 0 ? (
              <div className="mt-8 space-y-3 text-left">
                {apiItems.slice(0, 3).map((item) => (
                  <p className="rounded-lg bg-[#f8f4ee] px-4 py-3 text-sm font-medium text-[#4a433d]" key={item}>
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <>
                <p className="mt-8 text-lg text-[#5e5751]">No API routes configured.</p>
                <Link
                  className="mt-5 inline-flex text-base font-semibold underline underline-offset-4"
                  to="/api-keys"
                >
                  Configure Route
                </Link>
              </>
            )}
          </div>
        </section>

        <section className={tileClass}>
          <h2 className="flex items-center gap-3 text-[0.95rem] font-semibold tracking-[0.01em]">
            <Megaphone className="size-5" />
            Announcements
          </h2>

          <div className="mt-8 divide-y divide-[#ddd4ca]">
            {data.status.announcements_enabled && announcementItems.length > 0 ? (
              announcementItems.slice(0, 3).map((item, index) => (
                <article className="flex gap-4 py-5 first:pt-0" key={`${item}-${index}`}>
                  <span
                    className={
                      index === 0
                        ? "mt-1.5 size-2.5 rounded-full bg-black"
                        : "mt-1.5 size-2.5 rounded-full bg-[#d8d2d2]"
                    }
                  />
                  <div>
                    <h3 className="font-semibold text-[#181614]">{item}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5e5751]">
                      Platform notice from the current backend configuration.
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <article className="flex gap-4 py-5">
                <span className="mt-1.5 size-2.5 rounded-full bg-[#d8d2d2]" />
                <div>
                  <h3 className="font-semibold text-[#181614]">No announcements</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5e5751]">
                    Platform notices will appear here when enabled.
                  </p>
                </div>
              </article>
            )}
          </div>
        </section>

        <section className={tileClass}>
          <h2 className="flex items-center gap-3 text-[0.95rem] font-semibold tracking-[0.01em]">
            <ServerCog className="size-5" />
            Runtime Status
          </h2>

          <div className="mt-8 space-y-4">
            {[
              { label: data.status.system_name || "API Gateway", value: "Operational" },
              {
                label: "Runtime monitor",
                value: data.status.uptime_kuma_enabled ? "Enabled" : "Local status",
              },
              { label: "Started", value: formatStartTime(data.status.start_time) },
            ].map((item) => (
              <div
                className="flex min-h-14 items-center justify-between gap-4 rounded-[2px] border border-[#d7cec6] bg-[#fffdf8] px-4 text-base"
                key={item.label}
              >
                <span className="font-medium text-[#2b2621]">{item.label}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#23874d]">
                  <span className="size-2.5 rounded-full bg-[#23874d]" />
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
