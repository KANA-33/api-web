import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, PageInfo, PageQuery, UsageLogRecord } from "@shared/api/contracts";

export interface UsageLogsQuery extends PageQuery {
  type?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  token_name?: string;
  model_name?: string;
  group?: string;
  request_id?: string;
  upstream_request_id?: string;
}

export interface DrawingLogQuery extends PageQuery {
  mj_id?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}

export interface TaskLogQuery extends PageQuery {
  platform?: string;
  task_id?: string;
  status?: string;
  action?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}

export function getUsageLogs(query?: UsageLogsQuery) {
  return apiClient<ApiEnvelope<PageInfo<UsageLogRecord>>>({
    path: "/api/log/self",
    query,
  });
}

export function getDrawingLogs(query?: DrawingLogQuery) {
  return apiClient<ApiEnvelope<PageInfo<unknown>>>({
    path: "/api/mj/self",
    query,
  });
}

export function getTaskLogs(query?: TaskLogQuery) {
  return apiClient<ApiEnvelope<PageInfo<unknown>>>({
    path: "/api/task/self",
    query,
  });
}
