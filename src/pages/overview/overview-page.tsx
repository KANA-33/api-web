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
    <div className="space-y-8 pb-20 lg:pb-0">
      <PageTitle
        description="A calm command surface for balance, usage, platform notices, and the next actions that matter."
        title="Overview"
      />

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="min-h-64">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#837462]">Remaining quota</p>
              <strong className="mt-4 block text-5xl font-semibold text-[#2d2926]">
                {formatQuota(remainingQuota, data.status)}
              </strong>
            </div>
            <WalletCards className="size-7 text-[#8b765e]" />
          </div>
          <p className="mt-8 max-w-sm text-sm leading-6 text-[#655b50]">
            Used quota: {formatQuota(user?.used_quota, data.status)}. Request count:{" "}
            {formatRawNumber(user?.request_count)}.
          </p>
          <Link
            className="mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[#c9baa4] bg-[#efe5d6] px-4 text-sm font-medium text-[#2d2926] transition-colors hover:bg-[#e5d8c5]"
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
              <p className="text-sm text-[#837462]">{metric.label}</p>
              <strong className="mt-4 block text-3xl font-semibold">{metric.value}</strong>
              <span className="mt-5 block text-xs uppercase tracking-[0.2em] text-[#9a8973]">
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
              <p className="mt-2 text-sm text-[#655b50]">
                Finish these steps to make the workspace production-ready.
              </p>
            </div>
            <CheckCircle2 className="size-6 text-[#6d8067]" />
          </div>
          <div className="mt-6 grid gap-3">
            {["Create a scoped API key", "Review available models", "Check usage logs"].map(
              (item, index) => (
                <div
                  className="flex items-center justify-between rounded-md border border-[#ddcfbd] bg-[#f6efe5] px-4 py-3"
                  key={item}
                >
                  <span className="text-sm font-medium">{item}</span>
                  <span className="text-xs text-[#8a7a66]">0{index + 1}</span>
                </div>
              ),
            )}
          </div>
        </Card>

        <Card className="max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Platform brief</h2>
            <Clock3 className="size-5 text-[#8b765e]" />
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-[#dfd1be] bg-[#f7f0e8] p-4 text-sm leading-6 text-[#5f554b]">
              {data.status.system_name} started at {formatStartTime(data.status.start_time)}.
            </div>
            {briefItems.length > 0 ? (
              briefItems.map((item) => (
                <div
                  className="rounded-md border border-[#dfd1be] bg-[#f7f0e8] p-4 text-sm leading-6 text-[#5f554b]"
                  key={item}
                >
                  {item}
                </div>
              ))
            ) : (
              <div className="rounded-md border border-[#dfd1be] bg-[#f7f0e8] p-4 text-sm leading-6 text-[#5f554b]">
                No additional platform panels are enabled.
              </div>
            )}
          </div>
          <button
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-[#4b4640] transition-colors hover:bg-[#e8dece]"
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
