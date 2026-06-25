import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, BillingRecord, PageInfo, PageQuery } from "@shared/api/contracts";

export interface TopUpQuery extends PageQuery {
  keyword?: string;
}

export function listTopUps(query?: TopUpQuery) {
  return apiClient<ApiEnvelope<PageInfo<BillingRecord>>>({
    path: "/api/user/topup",
    query,
  });
}

export function completeTopUp(tradeNo: string) {
  return apiClient<ApiEnvelope<null>, { trade_no: string }>({
    body: { trade_no: tradeNo },
    method: "POST",
    path: "/api/user/topup/complete",
  });
}
