// src/pages/auth/LoginPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

function routeByRole(role: string | undefined | null) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN_GENERAL") return "/app/admin-general";
  if (r === "ADMIN") return "/app/admin-general"; // si luego tenés layout admin, lo cambiás
  if (r === "INSPECTOR") return "/app/inspector";
  if (r === "JEFE_DE_BARRIO") return "/app/jefe-barrio";
  if (r === "PERMISIONARIO") return "/app/permisionario";
  return "/app/postulante";
}

export function LoginPage() {
  const navigate = useNavigate();

  const { user, token, login, hydrated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ destino calculado una sola vez por render (sin efectos raros)
  const target = useMemo(() => routeByRole(user?.role), [user?.role]);

  // ✅ si ya está logueado, redirigir por rol (sin loops)
  useEffect(() => {
    if (!hydrated) return;
    if (token && user?.role) {
      navigate(target, { replace: true });
    }
  }, [hydrated, token, user?.role, target, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      // ✅ redirección inmediata por el rol REAL devuelto por backend
      const go = routeByRole(result.user?.role);
      navigate(go, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo iniciar sesión.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Ingresar</h1>
          <p className="text-xs text-slate-400">
            Acceso al sistema ZN98 (redirige automáticamente según rol).
          </p>
        </div>

        {error && (
          <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="admin@..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Contraseña</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-slate-50 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="text-[11px] text-slate-500">
          Tip: si te redirige mal, borrá storage:{" "}
          <span className="text-slate-300">localStorage['zn98_auth']</span> y{" "}
          <span className="text-slate-300">localStorage['token']</span>.
        </div>
      </div>
    </div>
  );
}
