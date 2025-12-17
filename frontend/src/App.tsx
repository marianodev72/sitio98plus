import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import AppRouter from "./router/AppRouter";

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, []);

  return <AppRouter />;
}
