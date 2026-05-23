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

function up(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function hasPerm(user: any, permiso: string) {
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  return permisos.map((item: unknown) => up(item)).includes(up(permiso));
}

function tieneTerritorioLugar(user: any) {
  return Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento.some(
        (territorio: any) => up(territorio?.tipo) === "LUGAR" && String(territorio?.valor || "").trim()
      )
    : false;
}

export default function MisComunicacionesInspectorAlojamientos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const autorizado =
    Boolean(user) &&
    (up(user?.role) === "INSPECTOR_ALOJAMIENTOS" || hasPerm(user, "INSPECTOR_ALOJAMIENTOS")) &&
    tieneTerritorioLugar(user);

  if (!autorizado) {
    return (
      <section style={cardStyle}>
        <h2 style={titleStyle}>Acceso no disponible</h2>
        <p style={subtitleStyle}>
          No posee permisos territoriales habilitados para comunicaciones de alojamientos.
        </p>
      </section>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Comunicaciones</h2>
          <p style={{ ...subtitleStyle, maxWidth: 760 }}>
            Mensajeria institucional del panel INSPECTOR_ALOJAMIENTOS con destinatarios territoriales.
          </p>
        </div>

        <div style={cardStyle}>
          <Mensajeria contexto="INSPECTOR_ALOJAMIENTOS" hideBarrioSelect />

          <div style={noteStyle}>
            Los destinatarios disponibles quedan restringidos a administracion y alojados con ocupacion
            activa dentro de los territorios asignados.
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              style={primaryButtonStyle}
              onClick={() => navigate("/app/permisionario/alojamientos-inspector")}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
