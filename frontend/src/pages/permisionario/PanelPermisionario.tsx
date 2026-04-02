// frontend/src/pages/permisionario/PanelPermisionario.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
  cardStyle,
  heroStyle,
  infoGridStyle,
  moduleButtonStyle,
  noteStyle,
  pageStyle,
  primaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "./uiStyles";

export default function PanelPermisionario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Panel del Permisionario</h2>

          <p style={{ ...subtitleStyle, maxWidth: 720 }}>
            Desde aquí puede consultar el estado del trámite y acceder a los módulos disponibles.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={infoGridStyle}>
            <div style={softCardStyle}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                Usuario
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                {user?.apellido} {user?.nombre}
              </div>
            </div>

            <div style={softCardStyle}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                Rol
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                {user?.role || "—"}
              </div>
            </div>

            <div style={softCardStyle}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                Estado habitacional
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                {user?.estadoHabitacional || "—"}
              </div>
            </div>
          </div>

          <h3 style={{ ...sectionTitleStyle, marginTop: 22 }}>Accesos rápidos</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <button
              style={primaryButtonStyle}
              onClick={() => navigate("/app/permisionario/anexos")}
            >
              Mis anexos
            </button>

            <button
              style={moduleButtonStyle}
              onClick={() => navigate("/app/permisionario/mis-datos")}
            >
              Mis datos declarados
            </button>

            <button
              style={successButtonStyle}
              onClick={() => navigate("/app/permisionario/anexo-04/nuevo")}
            >
              Crear ANEXO 04
            </button>
          </div>

          <div style={{ ...noteStyle, maxWidth: 720 }}>
            <b style={{ color: "#ffffff" }}>Nota:</b> Toda actualización de “Mis datos declarados”
            queda registrada con fecha y hora, y puede ser visualizada por Administración.
          </div>
        </div>
      </div>
    </div>
  );
}