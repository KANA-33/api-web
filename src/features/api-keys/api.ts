import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, ApiKeyRecord, PageInfo, PageQuery } from "@shared/api/contracts";

export interface SearchApiKeysQuery extends PageQuery {
  keyword?: string;
  token?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  expired_time: number;
  remain_quota: number;
  unlimited_quota: boolean;
  model_limits_enabled?: boolean;
  model_limits?: string;
  allow_ips?: string | null;
  group?: string;
  cross_group_retry?: boolean;
}

export interface UpdateApiKeyRequest extends Partial<CreateApiKeyRequest> {
  id: number;
  status?: number;
}

export function listApiKeys(query?: PageQuery) {
  return apiClient<ApiEnvelope<PageInfo<ApiKeyRecord>>>({
    path: "/api/token/",
    query,
  });
}

export function searchApiKeys(query: SearchApiKeysQuery) {
  return apiClient<ApiEnvelope<PageInfo<ApiKeyRecord>>>({
    path: "/api/token/search",
    query,
  });
}

export function createApiKey(request: CreateApiKeyRequest) {
  return apiClient<{ success: boolean; message: string }, CreateApiKeyRequest>({
    method: "POST",
    path: "/api/token/",
    body: request,
  });
}

export function updateApiKey(request: UpdateApiKeyRequest, statusOnly = false) {
  return apiClient<ApiEnvelope<ApiKeyRecord>, UpdateApiKeyRequest>({
    method: "PUT",
    path: "/api/token/",
    query: statusOnly ? { status_only: "true" } : undefined,
    body: request,
  });
}

export function deleteApiKey(id: number) {
  return apiClient<{ success: boolean; message: string }>({
    method: "DELETE",
    path: `/api/token/${id}`,
  });
}

export function revealApiKey(id: number) {
  return apiClient<ApiEnvelope<{ key: string }>, undefined>({
    method: "POST",
    path: `/api/token/${id}/key`,
  });
}
