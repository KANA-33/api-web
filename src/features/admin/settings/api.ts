import { apiClient } from "@shared/api/client";
import type { ApiEnvelope } from "@shared/api/contracts";

export interface AdminOption {
  key: string;
  value: string;
}

export interface UpdateOptionRequest {
  key: string;
  value: boolean | number | string;
}

export function listOptions() {
  return apiClient<ApiEnvelope<AdminOption[]>>({
    path: "/api/option/",
  });
}

export function updateOption(request: UpdateOptionRequest) {
  return apiClient<ApiEnvelope<null>, UpdateOptionRequest>({
    body: request,
    method: "PUT",
    path: "/api/option/",
  });
}
