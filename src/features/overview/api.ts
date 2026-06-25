import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, CurrentUser, PlatformStatus, UsageSummary } from "@shared/api/contracts";

export interface TimestampRangeQuery {
  start_timestamp: number;
  end_timestamp: number;
}

export interface UsageSummaryQuery {
  type?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  token_name?: string;
  model_name?: string;
  channel?: number;
  group?: string;
}

export function getPlatformStatus() {
  return apiClient<ApiEnvelope<PlatformStatus>>({
    path: "/api/status",
  });
}

export function getAccountBalanceSource() {
  return apiClient<ApiEnvelope<CurrentUser>>({
    path: "/api/user/self",
  });
}

export function getUsageSummary(query?: UsageSummaryQuery) {
  return apiClient<ApiEnvelope<UsageSummary>>({
    path: "/api/log/self/stat",
    query,
  });
}

export function getUsageChart(query: TimestampRangeQuery) {
  return apiClient<ApiEnvelope<unknown>>({
    path: "/api/data/self",
    query,
  });
}

export function getFlowChart(query: TimestampRangeQuery) {
  return apiClient<ApiEnvelope<unknown>>({
    path: "/api/data/flow/self",
    query,
  });
}
