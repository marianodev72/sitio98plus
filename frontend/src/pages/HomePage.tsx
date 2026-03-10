//.frontendi/src/pages/HomePage.tsx
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>SITIO 98</h1>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
          Sistema institucional de gestión de viviendas fiscales.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={() => navigate("/login")}
            style={{ padding: "8px 14px", fontWeight: 600 }}
          >
            Ingresar
          </button>

          <button
            onClick={() => navigate("/registro-postulante")}
            style={{ padding: "8px 14px", fontWeight: 600 }}
          >
            Registro de postulante
          </button>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
          Si ya dispone de usuario (ADMIN GENERAL, PERMISIONARIO, POSTULANTE, etc.),
          utilice el botón <b>Ingresar</b>.
        </p>
      </div>
    </div>
  );
}
