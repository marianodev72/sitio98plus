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
} from "../permisionario/uiStyles";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function MisComunicacionesAlojado() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (up(user?.role) !== "ALOJADO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La pagina solicitada no esta disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Mis comunicaciones</h2>
          <p style={{ ...subtitleStyle, maxWidth: 760 }}>
            Mensajeria institucional del panel ALOJADO con destinatarios autorizados.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={{ marginTop: 4 }}>
            <Mensajeria contexto="ALOJADO" hideBarrioSelect />
          </div>

          <div style={noteStyle}>
            Los destinatarios disponibles quedan restringidos a administracion e inspectores de
            alojamiento correspondientes.
          </div>

          <div style={{ marginTop: 18 }}>
            <button style={primaryButtonStyle} onClick={() => navigate("/app/alojado")}>
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
