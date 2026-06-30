import { useState, type FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import { useAuthStore } from "@features/auth/store";
import * as logsApi from "@features/logs/api";
import * as overviewApi from "@features/overview/api";
import { usePlatformStore } from "@features/platform/store";
import * as walletApi from "@features/wallet/api";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { Modal } from "@shared/ui/modal";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";
import { AccountMetricCards } from "./account-metric-cards";

type PaymentProvider = "epay" | "stripe" | "waffo";
type WalletAction = "redeem" | "top-up" | null;

function formatTime(timestamp: number) {
  if (!timestamp) {
    return "Pending";
  }

  return new Date(timestamp * 1000).toLocaleDateString();
}

function buildEpayUrl(baseUrl: string | undefined, params: Record<string, string>) {
  if (!baseUrl) {
    throw new Error("Payment URL was not returned.");
  }

  const url = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function getLast24hSummaryQuery() {
  const end_timestamp = Math.floor(Date.now() / 1000);
  return {
    end_timestamp,
    start_timestamp: end_timestamp - 24 * 60 * 60,
  };
}

export function WalletPage() {
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refresh);
  const platformStatus = usePlatformStore((state) => state.status);
  const [redeemKey, setRedeemKey] = useState("");
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("epay");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [waffoMethodIndex, setWaffoMethodIndex] = useState("");
  const [quote, setQuote] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<WalletAction>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const last24hRange = getLast24hSummaryQuery();
    const [topUpInfo, records, summary, usageLogs] = await Promise.all([
      walletApi.getTopUpInfo(),
      walletApi.getBillingRecords({ p: 1, page_size: 20 }),
      overviewApi.getUsageSummary(last24hRange),
      logsApi.getUsageLogs({
        ...last24hRange,
        p: 1,
        page_size: 500,
      }),
    ]);

    const firstPaymentMethod = topUpInfo.data.pay_methods?.[0]?.type ?? "";
    setPaymentMethod((current) => current || firstPaymentMethod);

    return {
      topUpInfo: topUpInfo.data,
      records: records.data,
      summary: summary.data,
      usageLogs: usageLogs.data,
      usageRange: last24hRange,
    };
  }, []);

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setSubmitting(true);

    try {
      const response = await walletApi.redeemCode({ key: redeemKey.trim() });
      setActionMessage(`Redeemed ${formatQuota(response.data, platformStatus)}.`);
      setRedeemKey("");
      await refreshUser();
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Redemption failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setQuote(null);
    setSubmitting(true);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setActionMessage("Enter a valid top-up amount.");
      setSubmitting(false);
      return;
    }

    try {
      if (provider === "stripe") {
        const response = walletApi.assertLegacySuccess(
          await walletApi.quoteStripeAmount({ amount: parsedAmount, payment_method: "stripe" }),
        );
        setQuote(response.data);
      } else if (provider === "waffo") {
        const response = walletApi.assertLegacySuccess(
          await walletApi.quoteWaffoAmount({
            amount: parsedAmount,
            ...(waffoMethodIndex ? { pay_method_index: Number(waffoMethodIndex) } : {}),
          }),
        );
        setQuote(response.data);
      } else {
        const response = walletApi.assertLegacySuccess(
          await walletApi.quoteEpayAmount({ amount: parsedAmount }),
        );
        setQuote(response.data);
      }
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Quote failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    setActionMessage(null);
    setSubmitting(true);

    const parsedAmount = Number(amount);
    try {
      if (provider === "stripe") {
        const response = walletApi.assertLegacySuccess(
          await walletApi.requestStripePay({ amount: parsedAmount, payment_method: "stripe" }),
        );
        window.location.href = response.data.pay_link;
      } else if (provider === "waffo") {
        const response = walletApi.assertLegacySuccess(
          await walletApi.requestWaffoPay({
            amount: parsedAmount,
            ...(waffoMethodIndex ? { pay_method_index: Number(waffoMethodIndex) } : {}),
          }),
        );
        window.location.href = response.data.payment_url;
      } else {
        const response = walletApi.assertLegacySuccess(
          await walletApi.requestEpay({ amount: parsedAmount, payment_method: paymentMethod }),
        );
        window.location.href = buildEpayUrl(response.url, response.data);
      }
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Payment request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const currentTopUpInfo = data?.topUpInfo;
  const epayMethods = currentTopUpInfo?.pay_methods ?? [];
  const waffoMethods = Array.isArray(currentTopUpInfo?.waffo_pay_methods)
    ? (currentTopUpInfo.waffo_pay_methods as Array<{
        pay_method_name?: string;
        pay_method_type?: string;
      }>)
    : [];

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => void reload()} variant="secondary">
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <AccountMetricCards
        activityEndTimestamp={data?.usageRange.end_timestamp}
        activityLogs={data?.usageLogs.items}
        activityTotal={data?.usageLogs.total}
        platformStatus={platformStatus}
        summary={data?.summary}
        summaryLoading={loading}
        user={user}
      />

      {loading && <LoadingBlock title="Loading wallet records" />}

      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Wallet data unavailable"
        />
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5">
              <Card>
                <h2 className="text-xl font-semibold">Redeem code</h2>
                <Button
                  className="mt-5 w-full"
                  disabled={!data.topUpInfo.enable_redemption}
                  onClick={() => {
                    setActionMessage(null);
                    setWalletAction("redeem");
                  }}
                  type="button"
                >
                  Open redemption
                </Button>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold">Online top-up</h2>
                <Button
                  className="mt-5 w-full"
                  disabled={
                    !data.topUpInfo.enable_online_topup &&
                    !data.topUpInfo.enable_stripe_topup &&
                    !data.topUpInfo.enable_waffo_topup
                  }
                  onClick={() => {
                    setActionMessage(null);
                    setWalletAction("top-up");
                  }}
                  type="button"
                >
                  Open top-up
                </Button>
              </Card>
            </div>

            {data.records.items.length === 0 ? (
              <EmptyBlock
                description=""
                title="No billing records"
              />
            ) : (
              <Card>
                <h2 className="text-xl font-semibold">Billing records</h2>
                <div className="mt-5 space-y-3">
                  {data.records.items.map((record) => (
                    <div
                      className="grid gap-2 rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] p-4 text-sm sm:grid-cols-[1fr_auto]"
                      key={record.id}
                    >
                      <div>
                        <p className="font-medium">{record.trade_no}</p>
                        <p className="mt-1 text-[#5f5958]">
                          {record.payment_provider || record.payment_method} ·{" "}
                          {formatTime(record.complete_time || record.create_time)} · {record.status}
                        </p>
                      </div>
                      <strong>{formatRawNumber(record.money || record.amount)}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <Modal
            description={undefined}
            onClose={() => setWalletAction(null)}
            open={walletAction === "redeem"}
            title="Redeem code"
          >
            <form className="grid gap-4" onSubmit={handleRedeem}>
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                onChange={(event) => setRedeemKey(event.target.value)}
                placeholder="Enter redemption code"
                required
                value={redeemKey}
              />
              {actionMessage && (
                <p className="rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 py-2 text-sm text-[#5f5958]">
                  {actionMessage}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button onClick={() => setWalletAction(null)} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button disabled={submitting || !data.topUpInfo.enable_redemption} type="submit">
                  Redeem
                </Button>
              </div>
            </form>
          </Modal>

          <Modal
            description={undefined}
            onClose={() => setWalletAction(null)}
            open={walletAction === "top-up"}
            title="Online top-up"
          >
            <form className="grid gap-3" onSubmit={handleQuote}>
              <select
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                onChange={(event) => setProvider(event.target.value as PaymentProvider)}
                value={provider}
              >
                <option disabled={!data.topUpInfo.enable_online_topup} value="epay">
                  EPay
                </option>
                <option disabled={!data.topUpInfo.enable_stripe_topup} value="stripe">
                  Stripe
                </option>
                <option disabled={!data.topUpInfo.enable_waffo_topup} value="waffo">
                  Waffo
                </option>
              </select>

              {provider === "epay" && (
                <select
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  value={paymentMethod}
                >
                  {epayMethods.map((method) => (
                    <option key={method.type} value={method.type}>
                      {method.name ?? method.type}
                    </option>
                  ))}
                  {epayMethods.length === 0 && <option value="">No EPay method</option>}
                </select>
              )}

              {provider === "waffo" && (
                <select
                  className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                  onChange={(event) => setWaffoMethodIndex(event.target.value)}
                  value={waffoMethodIndex}
                >
                  <option value="">Auto select</option>
                  {waffoMethods.map((method, index) => (
                    <option key={`${method.pay_method_type}-${index}`} value={index}>
                      {method.pay_method_name ?? method.pay_method_type ?? `Method ${index + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                min={1}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount"
                required
                type="number"
                value={amount}
              />

              {quote && (
                <p className="rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 py-2 text-sm text-[#5f5958]">
                  Estimated payment: {quote}
                </p>
              )}

              {actionMessage && (
                <p className="rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 py-2 text-sm text-[#5f5958]">
                  {actionMessage}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button disabled={submitting} type="submit" variant="secondary">
                  Quote
                </Button>
                <Button disabled={submitting || !quote} onClick={() => void handlePay()} type="button">
                  Pay
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
