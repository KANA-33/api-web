import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, PageQuery } from "@shared/api/contracts";

export interface AdminChannel {
  auto_ban?: number | null;
  balance: number;
  balance_updated_time: number;
  base_url?: string | null;
  channel_info?: {
    is_multi_key?: boolean;
    multi_key_mode?: "random" | "polling" | string;
    multi_key_polling_index?: number;
    multi_key_size?: number;
  };
  created_time: number;
  group: string;
  id: number;
  key?: string;
  key_mode?: "append" | "replace";
  model_mapping?: string | null;
  models: string;
  multi_key_mode?: "random" | "polling" | string;
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

export interface ChannelBatchRequest {
  ids: number[];
  tag?: string | null;
}

export interface ChannelTagRequest {
  tag: string;
}

export interface ChannelKeyResponse {
  key: string;
}

export interface UpstreamModelDetection {
  add_models: string[];
  auto_added_models: number;
  channel_id: number;
  channel_name: string;
  last_check_time: number;
  remove_models: string[];
}

export interface ChannelUpstreamUpdateRequest {
  add_models?: string[];
  id: number;
  ignore_models?: string[];
  remove_models?: string[];
}

export interface UpstreamModelApplyResult {
  added_models: string[];
  id: number;
  ignored_models: string[];
  models: string;
  remaining_models: string[];
  remaining_remove_models: string[];
  removed_models: string[];
  settings?: unknown;
}

export interface FetchModelsRequest {
  base_url?: string;
  key: string;
  type: number;
}

export interface MultiKeyManageRequest {
  action:
    | "delete_disabled_keys"
    | "delete_key"
    | "disable_all_keys"
    | "disable_key"
    | "enable_all_keys"
    | "enable_key"
    | "get_key_status";
  channel_id: number;
  key_index?: number;
  page?: number;
  page_size?: number;
  status?: number;
}

export interface MultiKeyStatusRecord {
  disabled_time?: number;
  index: number;
  key_preview: string;
  reason?: string;
  status: number;
}

export interface MultiKeyStatusResponse {
  auto_disabled_count: number;
  enabled_count: number;
  keys: MultiKeyStatusRecord[];
  manual_disabled_count: number;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
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

export function deleteChannelsBatch(request: ChannelBatchRequest) {
  return apiClient<{ data: number; message: string; success: boolean }, ChannelBatchRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/batch",
  });
}

export function deleteDisabledChannels() {
  return apiClient<{ data: number; message: string; success: boolean }>({
    method: "DELETE",
    path: "/api/channel/disabled",
  });
}

export function revealChannelKey(id: number) {
  return apiClient<ApiEnvelope<ChannelKeyResponse>>({
    method: "POST",
    path: `/api/channel/${id}/key`,
  });
}

export function fetchUpstreamModels(id: number) {
  return apiClient<ApiEnvelope<string[]>>({
    path: `/api/channel/fetch_models/${id}`,
  });
}

export function fetchModelsFromProvider(request: FetchModelsRequest) {
  return apiClient<ApiEnvelope<string[]>, FetchModelsRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/fetch_models",
  });
}

export function detectUpstreamModelUpdates(request: ChannelUpstreamUpdateRequest) {
  return apiClient<ApiEnvelope<UpstreamModelDetection>, ChannelUpstreamUpdateRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/upstream_updates/detect",
  });
}

export function applyUpstreamModelUpdates(request: ChannelUpstreamUpdateRequest) {
  return apiClient<ApiEnvelope<UpstreamModelApplyResult>, ChannelUpstreamUpdateRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/upstream_updates/apply",
  });
}

export function copyChannel(id: number) {
  return apiClient<{ message: string; success: boolean }>({
    method: "POST",
    path: `/api/channel/copy/${id}`,
  });
}

export function enableChannelsByTag(request: ChannelTagRequest) {
  return apiClient<{ message: string; success: boolean }, ChannelTagRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/tag/enabled",
  });
}

export function disableChannelsByTag(request: ChannelTagRequest) {
  return apiClient<{ message: string; success: boolean }, ChannelTagRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/tag/disabled",
  });
}

export function setChannelsTagBatch(request: ChannelBatchRequest) {
  return apiClient<{ data: number; message: string; success: boolean }, ChannelBatchRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/batch/tag",
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

export function manageMultiKeys(request: MultiKeyManageRequest) {
  return apiClient<ApiEnvelope<MultiKeyStatusResponse | number | null>, MultiKeyManageRequest>({
    body: request,
    method: "POST",
    path: "/api/channel/multi_key/manage",
  });
}
