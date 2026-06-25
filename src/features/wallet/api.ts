import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, BillingRecord, PageInfo, PageQuery } from "@shared/api/contracts";

export interface TopUpInfo {
  enable_online_topup: boolean;
  enable_stripe_topup: boolean;
  enable_creem_topup: boolean;
  enable_waffo_topup: boolean;
  enable_waffo_pancake_topup: boolean;
  enable_redemption: boolean;
  payment_compliance_confirmed: boolean;
  payment_compliance_terms_version?: string;
  pay_methods?: Array<Record<string, string>>;
  waffo_pay_methods?: unknown;
  min_topup?: number;
  stripe_min_topup?: number;
  waffo_min_topup?: number;
  waffo_pancake_min_topup?: number;
  amount_options?: unknown;
  discount?: unknown;
}

export interface BillingRecordsQuery extends PageQuery {
  keyword?: string;
}

export interface LegacyPaymentResponse<TData = unknown> {
  message: "success" | "error" | string;
  data: TData;
  url?: string;
}

export interface RedeemRequest {
  key: string;
}

export interface AmountRequest {
  amount: number;
}

export interface EpayRequest {
  amount: number;
  payment_method: string;
}

export interface StripePayRequest {
  amount: number;
  payment_method: "stripe";
  success_url?: string;
  cancel_url?: string;
}

export interface WaffoPayRequest {
  amount: number;
  pay_method_index?: number;
}

export interface StripePayResponse {
  pay_link: string;
}

export interface WaffoPayResponse {
  payment_url: string;
  order_id: string;
}

export function getTopUpInfo() {
  return apiClient<ApiEnvelope<TopUpInfo>>({
    path: "/api/user/topup/info",
  });
}

export function getBillingRecords(query?: BillingRecordsQuery) {
  return apiClient<ApiEnvelope<PageInfo<BillingRecord>>>({
    path: "/api/user/topup/self",
    query,
  });
}

export function redeemCode(request: RedeemRequest) {
  return apiClient<ApiEnvelope<number>, RedeemRequest>({
    method: "POST",
    path: "/api/user/topup",
    body: request,
  });
}

export function quoteEpayAmount(request: AmountRequest) {
  return apiClient<LegacyPaymentResponse<string>, AmountRequest>({
    method: "POST",
    path: "/api/user/amount",
    body: request,
  });
}

export function requestEpay(request: EpayRequest) {
  return apiClient<LegacyPaymentResponse<Record<string, string>>, EpayRequest>({
    method: "POST",
    path: "/api/user/pay",
    body: request,
  });
}

export function quoteStripeAmount(request: StripePayRequest) {
  return apiClient<LegacyPaymentResponse<string>, StripePayRequest>({
    method: "POST",
    path: "/api/user/stripe/amount",
    body: request,
  });
}

export function requestStripePay(request: StripePayRequest) {
  return apiClient<LegacyPaymentResponse<StripePayResponse>, StripePayRequest>({
    method: "POST",
    path: "/api/user/stripe/pay",
    body: request,
  });
}

export function quoteWaffoAmount(request: WaffoPayRequest) {
  return apiClient<LegacyPaymentResponse<string>, WaffoPayRequest>({
    method: "POST",
    path: "/api/user/waffo/amount",
    body: request,
  });
}

export function requestWaffoPay(request: WaffoPayRequest) {
  return apiClient<LegacyPaymentResponse<WaffoPayResponse>, WaffoPayRequest>({
    method: "POST",
    path: "/api/user/waffo/pay",
    body: request,
  });
}

export function assertLegacySuccess<TData>(response: LegacyPaymentResponse<TData>) {
  if (response.message !== "success") {
    throw new Error(typeof response.data === "string" ? response.data : "Payment request failed");
  }

  return response;
}
