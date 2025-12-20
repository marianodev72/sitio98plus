// frontend/src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { useAuth } from "../auth/useAuth";

function roleToAppPath(role: string) {
  const r = String(role || "").toUpperCase();

  switch (r) {
    case "ADMIN_GENERAL":
      return "/app/admin-general";
    case "ADMIN":
      return "/app/admin";
    case "INSPECTOR":
      return "/app/inspector";
    case "JEFE_DE_BARRIO":
      return "/app/jefe-de-barrio";
    case "PERMISIONARIO":
      return "/app/permisionario";
    case "ALOJADO":
      return "/app/alojado";
    case "POSTULANTE":
      return "/app/postulante";
    default:
      return "/app";
  }
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      // 1) Login (cookie httpOnly)
      await http.post("/auth/login", { email, password });

      // 2) Refresca estado del usuario y usa el usuario devuelto por refresh (no el estado viejo)
      const freshUser = await refresh();

      // 3) Redirige por rol
      const role = freshUser?.role || "";
      navigate(roleToAppPath(role), { replace: true });
    } catch (err) {
      // Mensaje genérico (seguridad)
      setMsg("No se ha podido procesar su solicitud, contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto" }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="username"
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12, fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}
