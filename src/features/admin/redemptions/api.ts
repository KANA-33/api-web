import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, PageInfo, PageQuery } from "@shared/api/contracts";

export interface AdminRedemption {
  count?: number;
  created_time: number;
  expired_time: number;
  id: number;
  key: string;
  name: string;
  quota: number;
  redeemed_time: number;
  status: number;
  used_user_id: number;
  user_id: number;
}

export interface RedemptionQuery extends PageQuery {
  keyword?: string;
}

export interface CreateRedemptionRequest {
  count: number;
  expired_time: number;
  name: string;
  quota: number;
}

export interface UpdateRedemptionRequest {
  expired_time: number;
  id: number;
  name: string;
  quota: number;
}

export function listRedemptions(query?: RedemptionQuery) {
  return apiClient<ApiEnvelope<PageInfo<AdminRedemption>>>({
    path: "/api/redemption/",
    query,
  });
}

export function searchRedemptions(query: RedemptionQuery) {
  return apiClient<ApiEnvelope<PageInfo<AdminRedemption>>>({
    path: "/api/redemption/search",
    query,
  });
}

export function createRedemption(request: CreateRedemptionRequest) {
  return apiClient<ApiEnvelope<string[]>, CreateRedemptionRequest>({
    body: request,
    method: "POST",
    path: "/api/redemption/",
  });
}

export function updateRedemption(request: UpdateRedemptionRequest) {
  return apiClient<ApiEnvelope<AdminRedemption>, UpdateRedemptionRequest>({
    body: request,
    method: "PUT",
    path: "/api/redemption/",
  });
}

export function updateRedemptionStatus(id: number, status: number) {
  return apiClient<ApiEnvelope<AdminRedemption>, { id: number; status: number }>({
    body: { id, status },
    method: "PUT",
    path: "/api/redemption/",
    query: { status_only: true },
  });
}

export function deleteRedemption(id: number) {
  return apiClient<ApiEnvelope<null>>({
    method: "DELETE",
    path: `/api/redemption/${id}`,
  });
}

export function deleteInvalidRedemptions() {
  return apiClient<ApiEnvelope<number>>({
    method: "DELETE",
    path: "/api/redemption/invalid",
  });
}
