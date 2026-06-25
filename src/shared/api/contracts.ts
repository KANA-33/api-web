export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageQuery {
  p?: number;
  page_size?: number;
  ps?: number;
  size?: number;
}

export interface PageInfo<T> {
  page: number;
  page_size: number;
  total: number;
  items: T[];
}

export interface CurrentUser {
  id: number;
  username: string;
  display_name?: string;
  role: number;
  status: number;
  email?: string;
  github_id?: string;
  discord_id?: string;
  oidc_id?: string;
  wechat_id?: string;
  telegram_id?: string;
  group?: string;
  quota: number;
  used_quota: number;
  request_count: number;
  aff_code?: string;
  aff_count?: number;
  aff_quota?: number;
  aff_history_quota?: number;
  inviter_id?: number;
  setting?: string;
  stripe_customer?: string;
  sidebar_modules?: string;
  permissions?: Record<string, unknown>;
}

export interface PlatformStatus {
  version: string;
  start_time: number;
  system_name: string;
  logo?: string;
  quota_per_unit: number;
  display_in_currency: boolean;
  quota_display_type: string;
  custom_currency_symbol?: string;
  custom_currency_exchange_rate?: number;
  enable_drawing: boolean;
  enable_task: boolean;
  register_enabled: boolean;
  password_login_enabled: boolean;
  password_register_enabled: boolean;
  self_use_mode_enabled?: boolean;
  api_info_enabled: boolean;
  uptime_kuma_enabled: boolean;
  announcements_enabled: boolean;
  faq_enabled: boolean;
  api_info?: unknown;
  announcements?: unknown;
  faq?: unknown;
}

export interface UsageSummary {
  quota: number;
  rpm: number;
  tpm: number;
}

export interface ApiKeyRecord {
  id: number;
  user_id: number;
  key: string;
  status: number;
  name: string;
  created_time: number;
  accessed_time: number;
  expired_time: number;
  remain_quota: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits?: string;
  allow_ips?: string | null;
  used_quota: number;
  group?: string;
  cross_group_retry?: boolean;
}

export interface UsageLogRecord {
  id: number;
  user_id: number;
  created_at: number;
  type: number;
  content: string;
  username?: string;
  token_name?: string;
  model_name?: string;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  use_time: number;
  is_stream: boolean;
  channel: number;
  channel_name?: string;
  token_id?: number;
  group?: string;
  ip?: string;
  request_id?: string;
  upstream_request_id?: string;
  other?: string;
}

export interface BillingRecord {
  id: number;
  user_id: number;
  amount: number;
  money: number;
  trade_no: string;
  payment_method: string;
  payment_provider: string;
  create_time: number;
  complete_time: number;
  status: string;
}
