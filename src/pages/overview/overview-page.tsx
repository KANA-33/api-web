import { ArrowUpRight, CheckCircle2, Clock3, WalletCards } from "lucide-react";
import { Link } from "@tanstack/react-router";
import * as overviewApi from "@features/overview/api";
import { useAuthStore } from "@features/auth/store";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

function formatStartTime(startTime?: number) {
  if (!startTime) {
    return "Not reported";
  }

  return new Date(startTime * 1000).toLocaleDateString();
}

export function OverviewPage() {
  const user = useAuthStore((state) => state.user);
  const { data, error, loading, reload } = useAsyncData(async () => {
    const [status, summary] = await Promise.all([
      overviewApi.getPlatformStatus(),
      overviewApi.getUsageSummary(),
    ]);

    return {
      status: status.data,
      summary: summary.data,
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <PageTitle
          description="A calm command surface for balance, usage, platform notices, and the next actions that matter."
          title="Overview"
        />
        <LoadingBlock title="Loading overview" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8 pb-20 lg:pb-0">
        <PageTitle
          description="A calm command surface for balance, usage, platform notices, and the next actions that matter."
          title="Overview"
        />
        <ErrorBlock
          actionLabel="Retry"
          description={error ?? "Overview data could not be loaded."}
          onAction={() => void reload()}
          title="Overview unavailable"
        />
      </div>
    );
  }

  const remainingQuota = Math.max((user?.quota ?? 0) - (user?.used_quota ?? 0), 0);
  const briefItems = [
    data.status.api_info_enabled ? "API information is available from platform status." : null,
    data.status.announcements_enabled ? "Announcements are enabled for this workspace." : null,
    data.status.faq_enabled ? "FAQ content is available for user support." : null,
    data.status.uptime_kuma_enabled ? "Runtime status monitoring is enabled." : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="space-y-9 pb-24 lg:pb-0">
      <PageTitle
        description="A calm command surface for balance, usage, platform notices, and the next actions that matter."
        title="Overview"
      />

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="min-h-64 overflow-hidden bg-[#211d19] text-[#fffaf3] shadow-[0_24px_60px_rgb(54_42_31_/_0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#d8cec3]">Remaining quota</p>
              <strong className="mt-4 block text-5xl font-semibold tracking-[-0.03em] text-[#fffaf3]">
                {formatQuota(remainingQuota, data.status)}
              </strong>
            </div>
            <WalletCards className="size-7 text-[#d8cec3]" />
          </div>
          <p className="mt-8 max-w-sm text-sm leading-6 text-[#d8cec3]">
            Used quota: {formatQuota(user?.used_quota, data.status)}. Request count:{" "}
            {formatRawNumber(user?.request_count)}.
          </p>
          <Link
            className="mt-8 inline-flex h-10 items-center justify-center rounded-lg border border-[#fffaf3]/24 bg-[#fffaf3]/10 px-4 text-sm font-medium text-[#fffaf3] transition-all hover:bg-[#fffaf3]/16 active:translate-y-px"
            to="/wallet"
          >
            Manage wallet
          </Link>
        </Card>

        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              label: "Usage quota",
              value: formatQuota(data.summary.quota, data.status),
              note: "Selected period",
            },
            { label: "RPM", value: formatRawNumber(data.summary.rpm), note: "Requests per minute" },
            { label: "TPM", value: formatRawNumber(data.summary.tpm), note: "Tokens per minute" },
          ].map((metric) => (
            <Card className="min-h-40" key={metric.label}>
              <p className="text-sm text-[#74695f]">{metric.label}</p>
              <strong className="mt-4 block text-3xl font-semibold tracking-[-0.02em]">
                {metric.value}
              </strong>
              <span className="mt-5 block text-xs uppercase tracking-[0.16em] text-[#74695f]">
                {metric.note}
              </span>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Setup guide</h2>
              <p className="mt-2 text-sm text-[#74695f]">
                Finish these steps to make the workspace production-ready.
              </p>
            </div>
            <CheckCircle2 className="size-6 text-[#68775f]" />
          </div>
          <div className="mt-6 grid gap-3">
            {["Create a scoped API key", "Review available models", "Check usage logs"].map(
              (item, index) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-[#ddd4ca]/88 bg-[#fffdf8]/72 px-4 py-3 shadow-[0_8px_20px_rgb(74_58_42_/_0.04)]"
                  key={item}
                >
                  <span className="text-sm font-medium">{item}</span>
                  <span className="text-xs text-[#74695f]">0{index + 1}</span>
                </div>
              ),
            )}
          </div>
        </Card>

        <Card className="max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Platform brief</h2>
            <Clock3 className="size-5 text-[#4a433d]" />
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-[#ddd4ca]/88 bg-[#fffdf8]/72 p-4 text-sm leading-6 text-[#4a433d]">
              {data.status.system_name} started at {formatStartTime(data.status.start_time)}.
            </div>
            {briefItems.length > 0 ? (
              briefItems.map((item) => (
                <div
                  className="rounded-lg border border-[#ddd4ca]/88 bg-[#fffdf8]/72 p-4 text-sm leading-6 text-[#4a433d]"
                  key={item}
                >
                  {item}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-[#ddd4ca]/88 bg-[#fffdf8]/72 p-4 text-sm leading-6 text-[#4a433d]">
                No additional platform panels are enabled.
              </div>
            )}
          </div>
          <button
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-[#2b2621] transition-all hover:bg-[#eee8e1] active:translate-y-px"
            onClick={() => void reload()}
            type="button"
          >
            Refresh
            <ArrowUpRight className="size-4" />
          </button>
        </Card>
      </div>
    </div>
  );
}
