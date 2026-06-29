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

export interface PerformanceStats {
  cache_stats?: {
    disk_cache_entries?: number;
    disk_cache_hits?: number;
    disk_cache_max_bytes?: number;
    disk_cache_misses?: number;
    disk_cache_size?: number;
    disk_cache_threshold_bytes?: number;
  };
  config?: {
    disk_cache_enabled: boolean;
    disk_cache_max_size_mb: number;
    disk_cache_path: string;
    disk_cache_threshold_mb: number;
    is_running_in_container: boolean;
    monitor_cpu_threshold: number;
    monitor_disk_threshold: number;
    monitor_enabled: boolean;
    monitor_memory_threshold: number;
  };
  disk_cache_info?: {
    exists: boolean;
    file_count: number;
    path: string;
    total_size: number;
  };
  disk_space_info?: {
    free?: number;
    total?: number;
    used?: number;
    used_percent?: number;
  };
  memory_stats?: {
    alloc: number;
    num_gc: number;
    num_goroutine: number;
    sys: number;
    total_alloc: number;
  };
}

export interface PerformanceLogFile {
  mod_time: string;
  name: string;
  size: number;
}

export interface PerformanceLogs {
  enabled: boolean;
  file_count: number;
  files: PerformanceLogFile[];
  log_dir: string;
  newest_time?: string;
  oldest_time?: string;
  total_size: number;
}

export interface CleanupLogsResult {
  deleted_count: number;
  failed_files: string[];
  freed_bytes: number;
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

export function getPerformanceStats() {
  return apiClient<ApiEnvelope<PerformanceStats>>({
    path: "/api/performance/stats",
  });
}

export function clearDiskCache() {
  return apiClient<ApiEnvelope<null>>({
    method: "DELETE",
    path: "/api/performance/disk_cache",
  });
}

export function resetPerformanceStats() {
  return apiClient<ApiEnvelope<null>>({
    method: "POST",
    path: "/api/performance/reset_stats",
  });
}

export function forceGC() {
  return apiClient<ApiEnvelope<null>>({
    method: "POST",
    path: "/api/performance/gc",
  });
}

export function getPerformanceLogs() {
  return apiClient<ApiEnvelope<PerformanceLogs>>({
    path: "/api/performance/logs",
  });
}

export function cleanupPerformanceLogs(query: { mode: "by_count" | "by_days"; value: number }) {
  return apiClient<ApiEnvelope<CleanupLogsResult>>({
    method: "DELETE",
    path: "/api/performance/logs",
    query,
  });
}
