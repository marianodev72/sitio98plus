import { create } from "zustand";
import api from "../lib/axios";

interface AuthState {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    const res = await api.post("/auth/login", { email, password });
    set({ user: res.data.user, loading: false });
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data.user });
    } catch {
      set({ user: null });
    }
  },
}));
