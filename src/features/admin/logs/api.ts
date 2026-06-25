import { apiClient } from "@shared/api/client";
import type {
  ApiEnvelope,
  PageInfo,
  PageQuery,
  UsageLogRecord,
  UsageSummary,
} from "@shared/api/contracts";

export interface AdminUsageLogsQuery extends PageQuery {
  channel?: number;
  end_timestamp?: number;
  group?: string;
  model_name?: string;
  request_id?: string;
  start_timestamp?: number;
  token_name?: string;
  type?: number;
  upstream_request_id?: string;
  username?: string;
}

export interface AdminDrawingLog {
  action: string;
  buttons: string;
  channel_id: number;
  code: number;
  description: string;
  fail_reason: string;
  finish_time: number;
  id: number;
  image_url: string;
  mj_id: string;
  progress: string;
  prompt: string;
  prompt_en: string;
  quota: number;
  start_time: number;
  state: string;
  status: string;
  submit_time: number;
  user_id: number;
  video_url?: string;
  video_urls?: string;
}

export interface AdminDrawingLogsQuery extends PageQuery {
  channel_id?: string;
  end_timestamp?: number;
  mj_id?: string;
  start_timestamp?: number;
}

export interface AdminTaskLog {
  action: string;
  channel_id: number;
  created_at: number;
  data?: unknown;
  fail_reason: string;
  finish_time: number;
  group: string;
  id: number;
  platform: string;
  progress: string;
  properties?: unknown;
  quota: number;
  result_url?: string;
  start_time: number;
  status: string;
  submit_time: number;
  task_id: string;
  updated_at: number;
  user_id: number;
  username?: string;
}

export interface AdminTaskLogsQuery extends PageQuery {
  action?: string;
  channel_id?: string;
  end_timestamp?: number;
  platform?: string;
  start_timestamp?: number;
  status?: string;
  task_id?: string;
}

export function getUsageLogs(query?: AdminUsageLogsQuery) {
  return apiClient<ApiEnvelope<PageInfo<UsageLogRecord>>>({
    path: "/api/log/",
    query,
  });
}

export function getUsageStat(query?: AdminUsageLogsQuery) {
  return apiClient<ApiEnvelope<UsageSummary>>({
    path: "/api/log/stat",
    query,
  });
}

export function getDrawingLogs(query?: AdminDrawingLogsQuery) {
  return apiClient<ApiEnvelope<PageInfo<AdminDrawingLog>>>({
    path: "/api/mj/",
    query,
  });
}

export function getTaskLogs(query?: AdminTaskLogsQuery) {
  return apiClient<ApiEnvelope<PageInfo<AdminTaskLog>>>({
    path: "/api/task/",
    query,
  });
}
