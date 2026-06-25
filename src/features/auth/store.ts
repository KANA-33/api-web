import { create } from "zustand";
import type { CurrentUser } from "@shared/api/contracts";
import * as authApi from "./api";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: CurrentUser | null;
  status: AuthStatus;
  error: string | null;
  refresh: () => Promise<CurrentUser | null>;
  signIn: (request: authApi.LoginRequest) => Promise<authApi.LoginResponseData>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,

  async refresh() {
    set({ status: "loading", error: null });

    try {
      const response = await authApi.getCurrentUser();
      set({ user: response.data, status: "authenticated", error: null });
      return response.data;
    } catch (error) {
      set({
        user: null,
        status: "anonymous",
        error: error instanceof Error ? error.message : "Session expired",
      });
      return null;
    }
  },

  async signIn(request) {
    set({ status: "loading", error: null });
    const response = await authApi.login(request);

    if (response.data.require_2fa) {
      set({ user: null, status: "anonymous", error: null });
      return response.data;
    }

    if (response.data.id) {
      localStorage.setItem("commercial_console_user_id", String(response.data.id));
    }

    const currentUser = await authApi.getCurrentUser();
    set({ user: currentUser.data, status: "authenticated", error: null });
    return response.data;
  },

  async signOut() {
    await authApi.logout().catch(() => undefined);
    localStorage.removeItem("commercial_console_user_id");
    set({ user: null, status: "anonymous", error: null });
  },
}));

export async function ensureAuthenticated() {
  const { status, user, refresh } = useAuthStore.getState();

  if (status === "authenticated" && user) {
    return user;
  }

  return refresh();
}
