import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, PageQuery } from "@shared/api/contracts";

export interface AdminChannel {
  auto_ban?: number | null;
  balance: number;
  balance_updated_time: number;
  base_url?: string | null;
  created_time: number;
  group: string;
  id: number;
  key?: string;
  model_mapping?: string | null;
  models: string;
  name: string;
  other: string;
  priority?: number | null;
  remark?: string | null;
  response_time: number;
  status: number;
  tag?: string | null;
  test_model?: string | null;
  test_time: number;
  type: number;
  used_quota: number;
  weight?: number | null;
}

export interface ChannelPage {
  items: AdminChannel[];
  page?: number;
  page_size?: number;
  total: number;
  type_counts?: Record<string, number>;
}

export interface ChannelQuery extends PageQuery {
  group?: string;
  id_sort?: boolean;
  keyword?: string;
  model?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  status?: number;
  type?: number;
}

export interface AddChannelRequest {
  batch_add_set_key_prefix_2_name?: boolean;
  channel: Partial<AdminChannel>;
  mode: "single";
  multi_key_mode?: string;
}

export function listChannels(query?: ChannelQuery) {
  return apiClient<ApiEnvelope<ChannelPage>>({
    path: "/api/channel/",
    query,
  });
}

export function searchChannels(query: ChannelQuery) {
  return apiClient<ApiEnvelope<ChannelPage>>({
    path: "/api/channel/search",
    query,
  });
}

export function createChannel(request: AddChannelRequest) {
  return apiClient<{ message: string; success: boolean }, AddChannelRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/",
  });
}

export function updateChannel(request: Partial<AdminChannel> & { id: number }) {
  return apiClient<{ message: string; success: boolean }, Partial<AdminChannel> & { id: number }>({
    body: request,
    method: "PUT",
    path: "/api/channel/",
  });
}

export function deleteChannel(id: number) {
  return apiClient<{ message: string; success: boolean }>({
    method: "DELETE",
    path: `/api/channel/${id}`,
  });
}

export function copyChannel(id: number) {
  return apiClient<{ message: string; success: boolean }>({
    method: "POST",
    path: `/api/channel/copy/${id}`,
  });
}

export function testChannel(id: number, model?: string) {
  return apiClient<{ error_code?: string; message: string; success: boolean; time: number }>({
    path: `/api/channel/test/${id}`,
    query: { model },
  });
}

export function updateChannelBalance(id: number) {
  return apiClient<{ balance: number; message: string; success: boolean }>({
    path: `/api/channel/update_balance/${id}`,
  });
}
