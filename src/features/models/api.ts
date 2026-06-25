import { apiClient } from "@shared/api/client";
import type { ApiEnvelope } from "@shared/api/contracts";

export function getUserModels() {
  return apiClient<ApiEnvelope<string[]>>({
    path: "/api/user/models",
  });
}

export function getDashboardModelMap() {
  return apiClient<ApiEnvelope<Record<string, string[]>>>({
    path: "/api/models",
  });
}
