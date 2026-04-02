// frontend/src/pages/permisionario/jefe/MiBarrioJefe.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import type { CSSProperties } from "react";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map(up).includes(up(permiso));
}

export default function MiBarrioJefe() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const esJefe = role === "PERMISIONARIO" && hasPermiso(user, "JEFE_DE_BARRIO");

  const pageStyle: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    color: "#E5E7EB",
    boxSizing: "border-box",
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    boxSizing: "border-box",
  };

  const titleStyle: CSSProperties = {
    marginTop: 0,
    marginBottom: 8,
    color: "#F8FAFC",
  };

  const textStyle: CSSProperties = {
    margin: "6px 0 12px 0",
    color: "#CBD5E1",
    lineHeight: 1.45,
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const primaryButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: "rgba(59,130,246,0.20)",
    fontWeight: 800,
  };

  if (!esJefe) {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 12, color: "#F8FAFC" }}>
        MI BARRIO (JEFE DE BARRIO)
      </h2>

      <div style={{ marginBottom: 16, color: "#CBD5E1" }}>
        Barrio asignado: <b style={{ color: "#F8FAFC" }}>{String(user?.barrioAsignado || "—")}</b>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <div style={cardStyle}>
          <h3 style={titleStyle}>Gestiones</h3>
          <p style={textStyle}>
            ANEXO_04 y ANEXO_11 del barrio.
          </p>
          <button
            onClick={() => navigate("/app/permisionario/mi-barrio-jefe/gestiones")}
            style={buttonStyle}
          >
            Abrir Gestiones
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Crear ANEXO 11</h3>
          <p style={textStyle}>
            Reparación / mantenimiento / provisión para espacios comunes.
          </p>
          <button
            onClick={() => navigate("/app/permisionario/mi-barrio-jefe/crear-anexo-11")}
            style={primaryButtonStyle}
          >
            Nuevo ANEXO 11
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Mensajes</h3>
          <p style={textStyle}>
            Canal institucional del barrio.
          </p>
          <button
            onClick={() => navigate("/app/permisionario/mi-barrio-jefe/mensajeria")}
            style={buttonStyle}
          >
            Abrir Mensajería
          </button>
        </div>
      </div>
    </div>
  );
}