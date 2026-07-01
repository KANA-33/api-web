import { apiClient } from "@shared/api/client";
import type { ApiEnvelope, CurrentUser } from "@shared/api/contracts";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponseData {
  id?: number;
  username?: string;
  display_name?: string;
  role?: number;
  status?: number;
  group?: string;
  require_2fa?: boolean;
}

export interface UpdateCurrentUserRequest {
  username?: string;
  display_name?: string;
  password?: string;
  original_password?: string;
  language?: string;
  sidebar_modules?: string;
}

export interface BindEmailRequest {
  email: string;
  code: string;
}

export function login(request: LoginRequest) {
  return apiClient<ApiEnvelope<LoginResponseData>, LoginRequest>({
    method: "POST",
    path: "/api/user/login",
    body: request,
  });
}

export function logout() {
  return apiClient<{ success: boolean; message: string }>({
    path: "/api/user/logout",
  });
}

export function getCurrentUser() {
  return apiClient<ApiEnvelope<CurrentUser>>({
    path: "/api/user/self",
  });
}

export function updateCurrentUser(request: UpdateCurrentUserRequest) {
  return apiClient<ApiEnvelope<unknown>, UpdateCurrentUserRequest>({
    method: "PUT",
    path: "/api/user/self",
    body: request,
  });
}

export function sendEmailVerification(email: string) {
  return apiClient<ApiEnvelope<null>>({
    path: "/api/verification",
    query: { email },
  });
}

export function bindEmail(request: BindEmailRequest) {
  return apiClient<ApiEnvelope<null>, BindEmailRequest>({
    method: "POST",
    path: "/api/oauth/email/bind",
    body: request,
  });
}
