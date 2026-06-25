import type { PlatformStatus } from "@shared/api/contracts";

const currencySymbols: Record<string, string> = {
  CNY: "¥",
  USD: "$",
};

function getDisplayType(status?: PlatformStatus | null) {
  return status?.quota_display_type?.toUpperCase() ?? "";
}

function getCurrencySymbol(status?: PlatformStatus | null) {
  const displayType = getDisplayType(status);

  if (displayType === "CUSTOM") {
    return status?.custom_currency_symbol || "¤";
  }

  return currencySymbols[displayType] ?? "";
}

function getCurrencyRate(status?: PlatformStatus | null) {
  if (getDisplayType(status) === "CUSTOM" && status?.custom_currency_exchange_rate) {
    return status.custom_currency_exchange_rate;
  }

  return 1;
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatRawNumber(value?: number) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatQuota(value?: number, status?: PlatformStatus | null) {
  const quota = value ?? 0;
  const displayType = getDisplayType(status);

  if (!status || displayType === "TOKENS" || status.display_in_currency === false) {
    return formatRawNumber(quota);
  }

  const quotaPerUnit = status.quota_per_unit > 0 ? status.quota_per_unit : 1;
  const converted = (quota / quotaPerUnit) * getCurrencyRate(status);

  return `${getCurrencySymbol(status)}${formatDecimal(converted)}`;
}
