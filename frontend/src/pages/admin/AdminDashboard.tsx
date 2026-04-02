// frontend/src/pages/admin/AdminDashboard.tsx
import { useAuth } from "../../auth/useAuth";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div
      style={{
        padding: 24,
        background: "#0b1220",
        minHeight: "100%",
        color: "#eaf0ff",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 12,
          padding: 18,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(6px)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 12, color: "#ffffff" }}>Panel ADMIN</h1>

        <p style={{ marginTop: 0, color: "rgba(255,255,255,0.82)" }}>
          Usuario: {user?.nombre} {user?.apellido} — <b>{user?.role}</b>
        </p>

        <p style={{ color: "rgba(255,255,255,0.82)" }}>
          Acceso de solo lectura a Usuarios, Viviendas, Gestiones y Liquidaciones.
          Mensajería habilitada.
        </p>

        <p style={{ marginBottom: 0 }}>
          <a
            href="/app/admin/liquidaciones"
            style={{
              color: "#93c5fd",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Ir a: Liquidaciones
          </a>
        </p>
      </div>
    </div>
  );
}