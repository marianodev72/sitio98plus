import { create } from "zustand";
import axios from "../api/axios";

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await axios.post("/auth/login", { email, password });
    set({ token: data.token, user: data.user });
    localStorage.setItem("token", data.token);
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem("token");
    if (!token) return set({ loading: false });

    try {
      const { data } = await axios.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      set({ user: data.user, token, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
