import { useAuth } from "../../auth/useAuth";

export default function PostulanteDashboard() {
  const { user } = useAuth();

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 16,
        color: "#F8FAFC",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 800,
          color: "#F8FAFC",
        }}
      >
        Panel POSTULANTE
      </h1>

      <p
        style={{
          marginTop: 12,
          marginBottom: 8,
          color: "#CBD5E1",
        }}
      >
        Usuario: {user?.nombre} {user?.apellido} — <b style={{ color: "#F8FAFC" }}>{user?.role}</b>
      </p>

      <p
        style={{
          margin: 0,
          color: "#9CA3AF",
        }}
      >
        (FASE 3A) Estructura base creada. Funcionalidades pendientes.
      </p>
    </div>
  );
}