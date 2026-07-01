import { create } from "zustand";
import type { PlatformStatus } from "@shared/api/contracts";
import * as overviewApi from "@features/overview/api";

interface PlatformState {
  status: PlatformStatus | null;
  loading: boolean;
  error: string | null;
  load: (force?: boolean) => Promise<PlatformStatus | null>;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  status: null,
  loading: false,
  error: null,

  async load(force = false) {
    const existing = get().status;
    if (existing && !force) {
      return existing;
    }

    set({ loading: true, error: null });

    try {
      const response = await overviewApi.getPlatformStatus();
      set({ status: response.data, loading: false, error: null });
      return response.data;
    } catch (caught) {
      set({
        status: null,
        loading: false,
        error: caught instanceof Error ? caught.message : "Platform status failed",
      });
      return null;
    }
  },
}));
