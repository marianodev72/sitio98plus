// frontend/src/pages/permisionario/MisComunicaciones.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import Mensajeria from "../admin_general/Mensajeria";
import {
  cardStyle,
  heroStyle,
  noteStyle,
  pageStyle,
  primaryButtonStyle,
  shellStyle,
  subtitleStyle,
  titleStyle,
} from "./uiStyles";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function MisComunicaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Gate institucional: solo PERMISIONARIO
  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const barrio = String(user?.barrioAsignado || "").trim();

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Mis comunicaciones</h2>

          <p style={{ ...subtitleStyle, maxWidth: 760 }}>
            Este módulo permite enviar y recibir mensajes institucionales dentro del circuito
            autorizado del sistema.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={{ marginTop: 4 }}>
            <Mensajeria lockedBarrio={barrio || undefined} hideBarrioSelect />
          </div>

          <div style={noteStyle}>
            La selección de barrio permanece restringida para mantener el circuito institucional
            definido para el usuario.
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              style={primaryButtonStyle}
              onClick={() => navigate("/app/permisionario")}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}