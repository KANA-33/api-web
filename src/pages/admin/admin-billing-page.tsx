import { useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  CreditCard,
  PackagePlus,
  RefreshCw,
  Save,
  Settings2,
  ToggleLeft,
} from "lucide-react";
import * as billingApi from "@features/admin/billing/api";
import type { SubscriptionPlan } from "@features/admin/billing/api";
import { useAuthStore } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import type { BillingRecord } from "@shared/api/contracts";
import { formatQuota } from "@shared/lib/quota-format";
import { isRootUser } from "@shared/lib/roles";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

const pageSize = 20;

const emptyPlan: SubscriptionPlan = {
  allow_balance_pay: true,
  allow_wallet_overflow: true,
  currency: "USD",
  custom_seconds: 0,
  downgrade_group: "",
  duration_unit: "month",
  duration_value: 1,
  enabled: true,
  id: 0,
  max_purchase_per_user: 0,
  price_amount: 0,
  quota_reset_custom_seconds: 0,
  quota_reset_period: "never",
  sort_order: 0,
  stripe_price_id: "",
  subtitle: "",
  title: "",
  total_amount: 0,
  upgrade_group: "",
};

interface GatewayField {
  key: string;
  label: string;
  sensitive?: boolean;
  type: "boolean" | "json" | "number" | "password" | "text" | "textarea";
}

interface GatewayGroup {
  fields: GatewayField[];
  title: string;
}

const gatewayGroups: GatewayGroup[] = [
  {
    title: "General",
    fields: [
      { key: "Price", label: "Unit price", type: "number" },
      { key: "USDExchangeRate", label: "USD exchange rate", type: "number" },
      { key: "MinTopUp", label: "Minimum top-up", type: "number" },
    ],
  },
  {
    title: "Stripe",
    fields: [
      { key: "StripeApiSecret", label: "API secret", sensitive: true, type: "password" },
      { key: "StripeWebhookSecret", label: "Webhook secret", sensitive: true, type: "password" },
      { key: "StripePriceId", label: "Top-up price id", type: "text" },
      { key: "StripeUnitPrice", label: "Unit price", type: "number" },
      { key: "StripeMinTopUp", label: "Minimum top-up", type: "number" },
      { key: "StripePromotionCodesEnabled", label: "Promotion codes", type: "boolean" },
    ],
  },
  {
    title: "Creem",
    fields: [
      { key: "CreemApiKey", label: "API key", sensitive: true, type: "password" },
      { key: "CreemWebhookSecret", label: "Webhook secret", sensitive: true, type: "password" },
      { key: "CreemProducts", label: "Products JSON", type: "json" },
      { key: "CreemTestMode", label: "Test mode", type: "boolean" },
    ],
  },
  {
    title: "Waffo",
    fields: [
      { key: "WaffoEnabled", label: "Enabled", type: "boolean" },
      { key: "WaffoSandbox", label: "Sandbox", type: "boolean" },
      { key: "WaffoMerchantId", label: "Merchant id", type: "text" },
      { key: "WaffoApiKey", label: "API key", sensitive: true, type: "password" },
      { key: "WaffoPrivateKey", label: "Private key", sensitive: true, type: "password" },
      { key: "WaffoPublicCert", label: "Public certificate", sensitive: true, type: "textarea" },
      { key: "WaffoNotifyUrl", label: "Notify URL", type: "text" },
      { key: "WaffoReturnUrl", label: "Return URL", type: "text" },
      { key: "WaffoSubscriptionReturnUrl", label: "Subscription return URL", type: "text" },
      { key: "WaffoCurrency", label: "Currency", type: "text" },
      { key: "WaffoUnitPrice", label: "Unit price", type: "number" },
      { key: "WaffoMinTopUp", label: "Minimum top-up", type: "number" },
      { key: "WaffoPayMethods", label: "Pay methods JSON", type: "json" },
    ],
  },
  {
    title: "Waffo Pancake",
    fields: [
      { key: "WaffoPancakeMerchantID", label: "Merchant id", type: "text" },
      { key: "WaffoPancakePrivateKey", label: "Private key", sensitive: true, type: "password" },
      { key: "WaffoPancakeReturnURL", label: "Return URL", type: "text" },
      { key: "WaffoPancakeStoreID", label: "Store id", type: "text" },
      { key: "WaffoPancakeProductID", label: "Top-up product id", type: "text" },
      { key: "WaffoPancakeUnitPrice", label: "Unit price", type: "number" },
      { key: "WaffoPancakeMinTopUp", label: "Minimum top-up", type: "number" },
    ],
  },
];

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

function optionMap(options?: billingApi.AdminOption[] | null) {
  return new Map((options ?? []).map((option) => [option.key, option.value]));
}

function parseBoolean(value: unknown) {
  return value === true || value === "true";
}

function normalizePlan(plan: SubscriptionPlan): SubscriptionPlan {
  return {
    ...plan,
    allow_balance_pay: parseBoolean(plan.allow_balance_pay),
    allow_wallet_overflow: parseBoolean(plan.allow_wallet_overflow),
    currency: "USD",
    custom_seconds: Number(plan.custom_seconds ?? 0),
    duration_value: Number(plan.duration_value ?? 1),
    max_purchase_per_user: Number(plan.max_purchase_per_user ?? 0),
    price_amount: Number(plan.price_amount ?? 0),
    quota_reset_custom_seconds: Number(plan.quota_reset_custom_seconds ?? 0),
    sort_order: Number(plan.sort_order ?? 0),
    total_amount: Number(plan.total_amount ?? 0),
  };
}

function isJsonFieldValid(type: string, value: string) {
  if (type !== "json") {
    return true;
  }

  try {
    JSON.parse(value || "null");
    return true;
  } catch {
    return false;
  }
}

export function AdminBillingPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const platformStatus = usePlatformStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const canEditGateways = isRootUser(user);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [tradeNo, setTradeNo] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<SubscriptionPlan>(emptyPlan);
  const [savingPlan, setSavingPlan] = useState(false);
  const [localOptions, setLocalOptions] = useState<Record<string, string>>({});
  const [savingOptionKey, setSavingOptionKey] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const response = await billingApi.listTopUps({
      keyword: appliedKeyword || undefined,
      p: page,
      page_size: pageSize,
    });
    return response.data;
  }, [page, appliedKeyword]);

  const {
    data: planData,
    error: planError,
    loading: planLoading,
    reload: reloadPlans,
  } = useAsyncData(async () => {
    const response = await billingApi.listSubscriptionPlans();
    return response.data.map((item) => item.plan);
  }, []);

  const {
    data: optionData,
    error: optionError,
    reload: reloadOptions,
  } = useAsyncData(async () => {
    if (!canEditGateways) {
      return [];
    }

    const response = await billingApi.listOptions();
    setLocalOptions(Object.fromEntries(response.data.map((option) => [option.key, option.value])));
    return response.data;
  }, [canEditGateways]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const options = useMemo(() => optionMap(optionData), [optionData]);
  const complianceConfirmed = options.get("payment_setting.compliance_confirmed") === "true";

  function getOptionValue(key: string) {
    return localOptions[key] ?? options.get(key) ?? "";
  }

  function setPlanField<K extends keyof SubscriptionPlan>(key: K, value: SubscriptionPlan[K]) {
    setPlanDraft((current) => ({ ...current, [key]: value }));
  }

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

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizePlan(planDraft);

    if (!normalized.title.trim()) {
      setActionMessage("Plan title is required.");
      return;
    }

    setSavingPlan(true);
    try {
      if (normalized.id > 0) {
        await billingApi.updateSubscriptionPlan(normalized);
        setActionMessage("Subscription plan updated.");
      } else {
        const response = await billingApi.createSubscriptionPlan(normalized);
        setPlanDraft(response.data);
        setActionMessage("Subscription plan created.");
      }
      await reloadPlans();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Plan save failed.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function togglePlan(plan: SubscriptionPlan) {
    const result = await confirmSensitive({
      actionLabel: plan.enabled ? "Disable plan" : "Enable plan",
      confirmText: plan.title,
      description: `${plan.enabled ? "Disable" : "Enable"} subscription plan "${plan.title}".`,
      intent: plan.enabled ? "danger" : "warning",
      reasonLabel: "Operational reason",
      requireReason: true,
      title: "Change subscription plan status",
    });

    if (!result.confirmed) {
      return;
    }

    try {
      await billingApi.updateSubscriptionPlanStatus(plan.id, !plan.enabled);
      setActionMessage("Subscription plan status updated.");
      await reloadPlans();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Plan status update failed.");
    }
  }

  async function saveGatewayGroup(group: GatewayGroup) {
    const invalidField = group.fields.find(
      (field) => !isJsonFieldValid(field.type, getOptionValue(field.key)),
    );
    if (invalidField) {
      setActionMessage(`${invalidField.key} must be valid JSON.`);
      return;
    }

    const hasSensitiveFields = group.fields.some((field) => field.sensitive);
    const result = await confirmSensitive({
      actionLabel: `Save ${group.title}`,
      confirmText: group.title,
      description: hasSensitiveFields
        ? `This updates ${group.title} payment settings, including sensitive credential fields.`
        : `This updates ${group.title} payment settings.`,
      intent: hasSensitiveFields ? "danger" : "warning",
      reasonLabel: "Operational reason",
      requireReason: hasSensitiveFields,
      title: "Save payment gateway settings",
    });

    if (!result.confirmed) {
      return;
    }

    setSavingOptionKey(group.title);
    try {
      for (const field of group.fields) {
        const value = getOptionValue(field.key);
        await billingApi.updateOption({
          key: field.key,
          value: field.type === "boolean" ? value === "true" : value,
        });
      }
      setActionMessage(`${group.title} settings saved.`);
      await reloadOptions();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Payment setting update failed.");
    } finally {
      setSavingOptionKey(null);
    }
  }

  async function confirmCompliance() {
    const result = await confirmSensitive({
      actionLabel: "Confirm compliance",
      confirmText: "payment compliance",
      description:
        "This confirms that payment and redemption features can be enabled under the current compliance terms.",
      intent: "warning",
      reasonLabel: "Compliance note",
      requireReason: true,
      title: "Confirm payment compliance",
    });

    if (!result.confirmed) {
      return;
    }

    try {
      await billingApi.confirmPaymentCompliance();
      setActionMessage("Payment compliance confirmed.");
      await reloadOptions();
      await reloadPlans();
    } catch (caught) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Compliance confirmation failed.",
      );
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
          description="Review top-up records, manage subscription plans, and configure payment gateway settings."
          title="Billing"
        />
        <Button
          onClick={() => {
            void reload();
            void reloadPlans();
            void reloadOptions();
          }}
          variant="secondary"
        >
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {actionMessage && <p className="text-sm font-medium text-[#3b3736]">{actionMessage}</p>}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={applyFilters}>
            <input
              className="h-11 flex-1 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
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
              className="h-11 flex-1 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 font-mono text-sm outline-none focus:border-[#000000]"
              onChange={(event) => setTradeNo(event.target.value)}
              placeholder="Trade number for manual completion"
              value={tradeNo}
            />
            <Button type="submit">
              <BadgeCheck className="mr-2 size-4" />
              Complete
            </Button>
          </form>
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
            <p className="mt-2 text-sm text-[#5f5958]">
              Showing {data.items.length} of {data.total} top-up records.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#6c6a67]">
                <tr>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Order</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">User</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Amount</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Payment</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Status</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Timeline</th>
                  <th className="border-b border-[#d8d2d2] py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((record) => (
                  <tr key={record.id}>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div className="font-medium text-[#171717]">#{record.id}</div>
                      <div className="mt-1 max-w-80 truncate font-mono text-xs text-[#6c6a67]">
                        {record.trade_no || "No trade number"}
                      </div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">User {record.user_id}</td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div>{formatQuota(record.amount, platformStatus)}</div>
                      <div className="mt-1 text-xs text-[#6c6a67]">{formatMoney(record.money)}</div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <CreditCard className="size-4 text-[#000000]" />
                        {record.payment_provider || "Provider"}
                      </div>
                      <div className="mt-1 text-xs text-[#6c6a67]">
                        {record.payment_method || "Unknown method"}
                      </div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {isCompleted(record) ? (
                          <BadgeCheck className="size-4 text-[#63785f]" />
                        ) : (
                          <span className="size-2 rounded-full bg-[#a4744d]" />
                        )}
                        {record.status || "unknown"}
                      </span>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
                      <div>Created {formatTime(record.create_time)}</div>
                      <div className="mt-1 text-xs text-[#6c6a67]">
                        Completed {formatTime(record.complete_time)}
                      </div>
                    </td>
                    <td className="border-b border-[#efeded] py-4 pr-4">
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

          <div className="mt-5 flex items-center justify-between text-sm text-[#5f5958]">
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Subscription plans</h2>
              <p className="mt-2 text-sm text-[#5f5958]">Create and revise paid access plans.</p>
            </div>
            <Button onClick={() => setPlanDraft(emptyPlan)} type="button" variant="secondary">
              <PackagePlus className="mr-2 size-4" />
              New
            </Button>
          </div>

          {planLoading && <p className="mt-5 text-sm text-[#5f5958]">Loading plans...</p>}
          {planError && <p className="mt-5 text-sm text-[#7f1d1d]">{planError}</p>}

          <div className="mt-5 grid gap-3">
            {(planData ?? []).map((plan) => (
              <button
                className="rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-4 text-left transition-colors hover:border-[#c9b89f]"
                key={plan.id}
                onClick={() => setPlanDraft(normalizePlan(plan))}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{plan.title}</div>
                    <div className="mt-1 text-sm text-[#5f5958]">
                      {formatMoney(plan.price_amount)} · {plan.duration_value} {plan.duration_unit}
                    </div>
                  </div>
                  <span className={plan.enabled ? "text-[#63785f]" : "text-[#7f1d1d]"}>
                    {plan.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </button>
            ))}
            {(planData ?? []).length === 0 && !planLoading && (
              <p className="rounded-[2px] border border-dashed border-[#d8d2d2] p-4 text-sm text-[#5f5958]">
                No subscription plans yet.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <form className="grid gap-4" onSubmit={savePlan}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {planDraft.id > 0 ? `Edit plan #${planDraft.id}` : "Create plan"}
              </h2>
              {planDraft.id > 0 && (
                <Button
                  onClick={() => void togglePlan(planDraft)}
                  type="button"
                  variant="secondary"
                >
                  <ToggleLeft className="mr-2 size-4" />
                  {planDraft.enabled ? "Disable" : "Enable"}
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("title", event.target.value)}
                placeholder="Title"
                value={planDraft.title}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("subtitle", event.target.value)}
                placeholder="Subtitle"
                value={planDraft.subtitle ?? ""}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("price_amount", Number(event.target.value))}
                placeholder="Price"
                type="number"
                value={planDraft.price_amount}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("total_amount", Number(event.target.value))}
                placeholder="Total quota"
                type="number"
                value={planDraft.total_amount ?? 0}
              />
              <select
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) =>
                  setPlanField(
                    "duration_unit",
                    event.target.value as SubscriptionPlan["duration_unit"],
                  )
                }
                value={planDraft.duration_unit}
              >
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="day">Day</option>
                <option value="hour">Hour</option>
                <option value="custom">Custom seconds</option>
              </select>
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("duration_value", Number(event.target.value))}
                placeholder="Duration value"
                type="number"
                value={planDraft.duration_value}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("custom_seconds", Number(event.target.value))}
                placeholder="Custom seconds"
                type="number"
                value={planDraft.custom_seconds ?? 0}
              />
              <select
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) =>
                  setPlanField(
                    "quota_reset_period",
                    event.target.value as SubscriptionPlan["quota_reset_period"],
                  )
                }
                value={planDraft.quota_reset_period ?? "never"}
              >
                <option value="never">Never reset</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom seconds</option>
              </select>
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) =>
                  setPlanField("quota_reset_custom_seconds", Number(event.target.value))
                }
                placeholder="Reset custom seconds"
                type="number"
                value={planDraft.quota_reset_custom_seconds ?? 0}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) =>
                  setPlanField("max_purchase_per_user", Number(event.target.value))
                }
                placeholder="Max purchases per user"
                type="number"
                value={planDraft.max_purchase_per_user ?? 0}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("upgrade_group", event.target.value)}
                placeholder="Upgrade group"
                value={planDraft.upgrade_group ?? ""}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("downgrade_group", event.target.value)}
                placeholder="Downgrade group"
                value={planDraft.downgrade_group ?? ""}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("stripe_price_id", event.target.value)}
                placeholder="Stripe price id"
                value={planDraft.stripe_price_id ?? ""}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("creem_product_id", event.target.value)}
                placeholder="Creem product id"
                value={planDraft.creem_product_id ?? ""}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("waffo_pancake_product_id", event.target.value)}
                placeholder="Waffo Pancake product id"
                value={planDraft.waffo_pancake_product_id ?? ""}
              />
              <input
                className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
                onChange={(event) => setPlanField("sort_order", Number(event.target.value))}
                placeholder="Sort order"
                type="number"
                value={planDraft.sort_order ?? 0}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={planDraft.enabled}
                  onChange={(event) => setPlanField("enabled", event.target.checked)}
                  type="checkbox"
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={parseBoolean(planDraft.allow_balance_pay)}
                  onChange={(event) => setPlanField("allow_balance_pay", event.target.checked)}
                  type="checkbox"
                />
                Balance pay
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={parseBoolean(planDraft.allow_wallet_overflow)}
                  onChange={(event) => setPlanField("allow_wallet_overflow", event.target.checked)}
                  type="checkbox"
                />
                Wallet overflow
              </label>
            </div>

            <Button disabled={savingPlan} type="submit">
              <Save className="mr-2 size-4" />
              {savingPlan ? "Saving" : "Save plan"}
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#5f5958]">
              <Settings2 className="size-4" />
              Payment gateways
            </div>
            <h2 className="mt-3 text-xl font-semibold">Gateway configuration</h2>
            {optionError && <p className="mt-3 text-sm text-[#7f1d1d]">{optionError}</p>}
          </div>
          {canEditGateways && (
            <Button
              disabled={complianceConfirmed}
              onClick={() => void confirmCompliance()}
              type="button"
              variant={complianceConfirmed ? "secondary" : "primary"}
            >
              <BadgeCheck className="mr-2 size-4" />
              {complianceConfirmed ? "Compliance confirmed" : "Confirm compliance"}
            </Button>
          )}
        </div>

        {!canEditGateways ? (
          <p className="mt-5 rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-4 text-sm text-[#5f5958]">
            Root access is required to edit payment gateway credentials.
          </p>
        ) : (
          <div className="mt-6 grid gap-5">
            {gatewayGroups.map((group) => (
              <form
                className="rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-4"
                key={group.title}
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveGatewayGroup(group);
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">{group.title}</h3>
                  <Button
                    disabled={
                      savingOptionKey === group.title ||
                      group.fields.some(
                        (field) => !isJsonFieldValid(field.type, getOptionValue(field.key)),
                      )
                    }
                    type="submit"
                    variant="secondary"
                  >
                    <Save className="mr-2 size-4" />
                    Save {group.title}
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {group.fields.map((field) => {
                    const value = getOptionValue(field.key);
                    const invalidJson = !isJsonFieldValid(field.type, value);
                    return (
                      <div className="grid gap-2" key={field.key}>
                        <label className="text-sm font-medium text-[#3f3931]">{field.label}</label>
                        {field.type === "boolean" ? (
                          <select
                            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                            onChange={(event) =>
                              setLocalOptions((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                            value={value === "true" ? "true" : "false"}
                          >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                          </select>
                        ) : field.type === "textarea" || field.type === "json" ? (
                          <textarea
                            className="min-h-24 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 py-2 text-sm outline-none focus:border-[#000000]"
                            onChange={(event) =>
                              setLocalOptions((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                            value={value}
                          />
                        ) : (
                          <input
                            className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
                            onChange={(event) =>
                              setLocalOptions((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                            type={field.type}
                            value={value}
                          />
                        )}
                        {invalidJson && <p className="text-xs text-[#7f1d1d]">Invalid JSON</p>}
                      </div>
                    );
                  })}
                </div>
              </form>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
