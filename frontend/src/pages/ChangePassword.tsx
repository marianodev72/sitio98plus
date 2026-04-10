import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { useAuth } from "../auth/useAuth";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Debe completar todos los campos.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await http.post("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      const updatedUser = data?.user || null;

      if (updatedUser) {
        setUser(updatedUser);
      } else {
        await refresh();
      }

      // 🔐 Luego del cambio, enviar al sistema
      navigate("/app", { replace: true });
    } catch (e: any) {
      const msg =
        String(e?.response?.data?.message || "").trim() ||
        "No se pudo actualizar la contraseña.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#fff" }}>
      <section style={{ padding: "40px 24px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <h2 style={{ marginBottom: 12 }}>Cambio obligatorio de contraseña</h2>

          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 18 }}>
            Por seguridad, debe actualizar su contraseña antes de continuar.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 12, color: "#ffb4b4" }}>
              {error}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}