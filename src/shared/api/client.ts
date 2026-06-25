import { createApiClient } from "./http-client";

export const apiClient = createApiClient({
  baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? "",
  getBearerToken: () => localStorage.getItem("commercial_console_api_key"),
  getUserId: () => localStorage.getItem("commercial_console_user_id"),
});
