import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, PageQuery } from "@shared/api/contracts";

export interface BoundChannel {
  name: string;
  type: number;
}

export interface AdminModel {
  bound_channels?: BoundChannel[];
  created_time: number;
  description?: string;
  enable_groups?: string[];
  endpoints?: string;
  icon?: string;
  id: number;
  matched_count?: number;
  matched_models?: string[];
  model_name: string;
  name_rule: number;
  quota_types?: number[];
  status: number;
  sync_official: number;
  tags?: string;
  updated_time: number;
  vendor_id?: number;
}

export interface AdminVendor {
  created_time: number;
  description?: string;
  icon?: string;
  id: number;
  name: string;
  status: number;
  updated_time: number;
}

export interface PrefillGroup {
  created_time: number;
  description?: string;
  id: number;
  items: unknown;
  name: string;
  type: string;
  updated_time: number;
}

export interface UpstreamSyncConflictField {
  field: string;
  local: unknown;
  upstream: unknown;
}

export interface UpstreamSyncConflict {
  fields: UpstreamSyncConflictField[];
  model_name: string;
}

export interface UpstreamSyncPreview {
  conflicts: UpstreamSyncConflict[];
  missing: string[];
  source: {
    locale?: string;
    models_url: string;
    vendors_url: string;
  };
}

export interface UpstreamSyncRequest {
  locale?: string;
  overwrite?: Array<{
    fields: string[];
    model_name: string;
  }>;
}

export interface UpstreamSyncResult {
  created_list: string[];
  created_models: number;
  created_vendors: number;
  skipped_models: string[];
  source: {
    locale?: string;
    models_url: string;
    vendors_url: string;
  };
  updated_list: string[];
  updated_models: number;
}

export interface DeploymentRecord {
  amount_paid?: number;
  brand_name?: string;
  completed_percent?: number;
  compute_minutes_remaining?: number;
  compute_minutes_served?: number;
  container_config?: unknown;
  container_name?: string;
  created_at?: number;
  deployment_name: string;
  description?: string;
  gpus_per_container?: number;
  hardware_id?: number;
  hardware_info?: string;
  hardware_name?: string;
  hardware_quantity?: number;
  id: string;
  instance_count?: number;
  locations?: Array<{ id: number; iso2?: string; name: string }>;
  model_name?: string;
  model_version?: string;
  provider?: string;
  resource_config?: Record<string, unknown>;
  status: string;
  time_remaining?: string;
  time_remaining_minutes?: number;
  total_containers?: number;
  total_gpus?: number;
  type?: string;
  updated_at?: number;
}

export interface DeploymentPage {
  items: DeploymentRecord[];
  page: number;
  page_size: number;
  status_counts?: Record<string, number>;
  total: number;
}

export interface DeploymentSettings {
  can_connect: boolean;
  configured: boolean;
  enabled: boolean;
  provider: string;
}

export interface DeploymentContainerEvent {
  message: string;
  time: number;
}

export interface DeploymentContainer {
  brand_name?: string;
  container_id: string;
  created_at?: number;
  device_id?: string;
  events?: DeploymentContainerEvent[];
  gpus_per_container?: number;
  hardware?: string;
  public_url?: string;
  status: string;
  uptime_percent?: number;
}

export interface DeploymentContainersResponse {
  containers: DeploymentContainer[];
  total: number;
}

export interface DeploymentCreateRequest {
  container_config: {
    args?: string[];
    entrypoint?: string[];
    env_variables?: Record<string, string>;
    replica_count: number;
    secret_env_variables?: Record<string, string>;
    traffic_port?: number;
  };
  duration_hours: number;
  gpus_per_container: number;
  hardware_id: number;
  location_ids: number[];
  registry_config: {
    image_url: string;
    registry_secret?: string;
    registry_username?: string;
  };
  resource_private_name: string;
}

export interface DeploymentUpdateRequest {
  args?: string[];
  command?: string;
  entrypoint?: string[];
  env_variables?: Record<string, string>;
  image_url?: string;
  registry_secret?: string;
  registry_username?: string;
  secret_env_variables?: Record<string, string>;
  traffic_port?: number;
}

export interface ModelPage {
  items: AdminModel[];
  page: number;
  page_size: number;
  total: number;
  vendor_counts?: Record<string, number>;
}

export interface VendorPage {
  items: AdminVendor[];
  page: number;
  page_size: number;
  total: number;
}

export interface ModelQuery extends PageQuery {
  keyword?: string;
  vendor?: string;
}

export interface DeploymentQuery extends PageQuery {
  keyword?: string;
  status?: string;
}

export function listModels(query?: ModelQuery) {
  return apiClient<ApiEnvelope<ModelPage>>({
    path: "/api/models/",
    query,
  });
}

export function searchModels(query: ModelQuery) {
  return apiClient<ApiEnvelope<ModelPage>>({
    path: "/api/models/search",
    query,
  });
}

export function createModel(request: Partial<AdminModel>) {
  return apiClient<ApiEnvelope<AdminModel>, Partial<AdminModel>>({
    body: request,
    method: "POST",
    path: "/api/models/",
  });
}

export function updateModel(request: Partial<AdminModel> & { id: number }) {
  return apiClient<ApiEnvelope<AdminModel>, Partial<AdminModel> & { id: number }>({
    body: request,
    method: "PUT",
    path: "/api/models/",
  });
}

export function updateModelStatus(id: number, status: number) {
  return apiClient<ApiEnvelope<AdminModel>, { id: number; status: number }>({
    body: { id, status },
    method: "PUT",
    path: "/api/models/",
    query: { status_only: true },
  });
}

export function deleteModel(id: number) {
  return apiClient<ApiEnvelope<null>>({
    method: "DELETE",
    path: `/api/models/${id}`,
  });
}

export function listVendors(query?: PageQuery) {
  return apiClient<ApiEnvelope<VendorPage>>({
    path: "/api/vendors/",
    query,
  });
}

export function createVendor(request: Partial<AdminVendor>) {
  return apiClient<ApiEnvelope<AdminVendor>, Partial<AdminVendor>>({
    body: request,
    method: "POST",
    path: "/api/vendors/",
  });
}

export function updateVendor(request: Partial<AdminVendor> & { id: number }) {
  return apiClient<ApiEnvelope<AdminVendor>, Partial<AdminVendor> & { id: number }>({
    body: request,
    method: "PUT",
    path: "/api/vendors/",
  });
}

export function updateVendorStatus(id: number, status: number) {
  return apiClient<ApiEnvelope<AdminVendor>, { id: number; status: number }>({
    body: { id, status },
    method: "PUT",
    path: "/api/vendors/",
    query: { status_only: true },
  });
}

export function deleteVendor(id: number) {
  return apiClient<ApiEnvelope<null>>({
    method: "DELETE",
    path: `/api/vendors/${id}`,
  });
}

export function getMissingModels() {
  return apiClient<ApiEnvelope<string[]>>({
    path: "/api/models/missing",
  });
}

export function previewUpstreamSync(locale?: string) {
  return apiClient<ApiEnvelope<UpstreamSyncPreview>>({
    path: "/api/models/sync_upstream/preview",
    query: { locale },
  });
}

export function syncUpstreamModels(request: UpstreamSyncRequest) {
  return apiClient<ApiEnvelope<UpstreamSyncResult>, UpstreamSyncRequest>({
    body: request,
    method: "POST",
    path: "/api/models/sync_upstream",
  });
}

export function listPrefillGroups(type?: string) {
  return apiClient<ApiEnvelope<PrefillGroup[]>>({
    path: "/api/prefill_group/",
    query: { type },
  });
}

export function createPrefillGroup(request: Partial<PrefillGroup>) {
  return apiClient<ApiEnvelope<PrefillGroup>, Partial<PrefillGroup>>({
    body: request,
    method: "POST",
    path: "/api/prefill_group/",
  });
}

export function updatePrefillGroup(request: Partial<PrefillGroup> & { id: number }) {
  return apiClient<ApiEnvelope<PrefillGroup>, Partial<PrefillGroup> & { id: number }>({
    body: request,
    method: "PUT",
    path: "/api/prefill_group/",
  });
}

export function deletePrefillGroup(id: number) {
  return apiClient<ApiEnvelope<null>>({
    method: "DELETE",
    path: `/api/prefill_group/${id}`,
  });
}

export function getDeploymentSettings() {
  return apiClient<ApiEnvelope<DeploymentSettings>>({
    path: "/api/deployments/settings",
  });
}

export function listDeployments(query?: DeploymentQuery) {
  return apiClient<ApiEnvelope<DeploymentPage>>({
    path: query?.keyword || query?.status ? "/api/deployments/search" : "/api/deployments/",
    query,
  });
}

export function getDeployment(id: string) {
  return apiClient<ApiEnvelope<DeploymentRecord>>({
    path: `/api/deployments/${id}`,
  });
}

export function createDeployment(request: DeploymentCreateRequest) {
  return apiClient<
    ApiEnvelope<{ deployment_id: string; message: string; status: string }>,
    DeploymentCreateRequest
  >({
    body: request,
    method: "POST",
    path: "/api/deployments/",
  });
}

export function updateDeployment(id: string, request: DeploymentUpdateRequest) {
  return apiClient<ApiEnvelope<{ deployment_id: string; status: string }>, DeploymentUpdateRequest>(
    {
      body: request,
      method: "PUT",
      path: `/api/deployments/${id}`,
    },
  );
}

export function updateDeploymentName(id: string, name: string) {
  return apiClient<
    ApiEnvelope<{ id: string; message: string; name: string; status: string }>,
    { name: string }
  >({
    body: { name },
    method: "PUT",
    path: `/api/deployments/${id}/name`,
  });
}

export function extendDeployment(id: string, durationHours: number) {
  return apiClient<ApiEnvelope<DeploymentRecord>, { duration_hours: number }>({
    body: { duration_hours: durationHours },
    method: "POST",
    path: `/api/deployments/${id}/extend`,
  });
}

export function deleteDeployment(id: string) {
  return apiClient<ApiEnvelope<{ deployment_id: string; message: string; status: string }>>({
    method: "DELETE",
    path: `/api/deployments/${id}`,
  });
}

export function listDeploymentContainers(id: string) {
  return apiClient<ApiEnvelope<DeploymentContainersResponse>>({
    path: `/api/deployments/${id}/containers`,
  });
}

export function getDeploymentLogs(id: string, containerId: string) {
  return apiClient<ApiEnvelope<unknown>>({
    path: `/api/deployments/${id}/logs`,
    query: { container_id: containerId },
  });
}
