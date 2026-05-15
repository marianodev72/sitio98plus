import { useAuth } from "../../auth/useAuth";

export default function AlojadoDashboard() {
  const { user } = useAuth();

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "clamp(14px, 2vw, 20px)",
      }}
    >
      <h1 style={{ marginTop: 0, color: "#ffffff" }}>Panel ALOJADO</h1>
      <p>
        Usuario: {user?.nombre} {user?.apellido} - <b>{user?.role}</b>
      </p>
      <p style={{ color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
        Estructura base protegida. Las funciones operativas de alojamiento se habilitaran en etapas posteriores.
      </p>
    </div>
  );
}
