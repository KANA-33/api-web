import { useState, type FormEvent } from "react";
import { BadgeCheck, CreditCard, RefreshCw } from "lucide-react";
import * as billingApi from "@features/admin/billing/api";
import { usePlatformStore } from "@features/platform/store";
import type { BillingRecord } from "@shared/api/contracts";
import { formatQuota } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const pageSize = 20;

function formatTime(timestamp?: number) {
  if (!timestamp) {
    return "Never";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function formatMoney(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "$0.00";
  }

  return `$${value.toFixed(2)}`;
}

function isCompleted(record: BillingRecord) {
  return record.status.toLowerCase() === "success" || record.complete_time > 0;
}

export function AdminBillingPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const platformStatus = usePlatformStore((state) => state.status);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [tradeNo, setTradeNo] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const response = await billingApi.listTopUps({
      keyword: appliedKeyword || undefined,
      p: page,
      page_size: pageSize,
    });
    return response.data;
  }, [page, appliedKeyword]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  async function completeByTradeNo(nextTradeNo: string) {
    const normalizedTradeNo = nextTradeNo.trim();

    if (!normalizedTradeNo) {
      setActionMessage("Trade number is required.");
      return;
    }

    const result = await confirmSensitive({
      actionLabel: "Complete top-up",
      confirmText: normalizedTradeNo,
      description: `This marks top-up "${normalizedTradeNo}" as complete and may credit the user's balance. Only use this after payment has been verified.`,
      reasonLabel: "Reason for audit context",
      title: "Complete top-up manually",
    });

    if (!result.confirmed) {
      return;
    }

    setActionMessage(null);

    try {
      await billingApi.completeTopUp(normalizedTradeNo);
      setActionMessage("Top-up completed.");
      setTradeNo("");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Top-up completion failed");
    }
  }

  function handleManualComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void completeByTradeNo(tradeNo);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle
          description="Review top-up records, reconcile payment state, and manually complete orders when provider callbacks need operator intervention."
          title="Billing"
        />
        <Button onClick={() => void reload()} variant="secondary">
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={applyFilters}>
            <input
              className="h-11 flex-1 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search trade number, provider, or user context"
              value={keyword}
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </Card>

        <Card>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleManualComplete}>
            <input
              className="h-11 flex-1 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 font-mono text-sm outline-none focus:border-[#8b765e]"
              onChange={(event) => setTradeNo(event.target.value)}
              placeholder="Trade number for manual completion"
              value={tradeNo}
            />
            <Button type="submit">
              <BadgeCheck className="mr-2 size-4" />
              Complete
            </Button>
          </form>
          {actionMessage && (
            <p className="mt-4 text-sm font-medium text-[#5d4f41]">{actionMessage}</p>
          )}
        </Card>
      </div>

      {loading && <LoadingBlock title="Loading billing records" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Billing records unavailable"
        />
      )}

      {!loading && !error && data?.items.length === 0 && (
        <EmptyBlock
          description="No top-up records match the current filters."
          title="No billing records found"
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card>
          <div>
            <h2 className="text-xl font-semibold">Top-up ledger</h2>
            <p className="mt-2 text-sm text-[#655b50]">
              Showing {data.items.length} of {data.total} top-up records.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#8d7a63]">
                <tr>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Order</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">User</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Amount</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Payment</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Status</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Timeline</th>
                  <th className="border-b border-[#ddcfbd] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((record) => (
                  <tr key={record.id}>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="font-medium text-[#2d2926]">#{record.id}</div>
                      <div className="mt-1 max-w-80 truncate font-mono text-xs text-[#7c6e5e]">
                        {record.trade_no || "No trade number"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">User {record.user_id}</td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>{formatQuota(record.amount, platformStatus)}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">{formatMoney(record.money)}</div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <CreditCard className="size-4 text-[#8b765e]" />
                        {record.payment_provider || "Provider"}
                      </div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        {record.payment_method || "Unknown method"}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {isCompleted(record) ? (
                          <BadgeCheck className="size-4 text-[#63785f]" />
                        ) : (
                          <span className="size-2 rounded-full bg-[#a4744d]" />
                        )}
                        {record.status || "unknown"}
                      </span>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <div>Created {formatTime(record.create_time)}</div>
                      <div className="mt-1 text-xs text-[#7c6e5e]">
                        Completed {formatTime(record.complete_time)}
                      </div>
                    </td>
                    <td className="border-b border-[#eadfce] py-4 pr-4">
                      <Button
                        disabled={isCompleted(record) || !record.trade_no}
                        onClick={() => void completeByTradeNo(record.trade_no)}
                        variant="secondary"
                      >
                        Complete
                      </Button>
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
