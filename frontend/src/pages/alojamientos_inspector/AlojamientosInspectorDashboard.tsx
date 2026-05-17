import { useAuth } from "../../auth/useAuth";
import { useNavigate } from "react-router-dom";
import {
  badgeStyle,
  cardStyle,
  infoGridStyle,
  metaStyle,
  moduleButtonStyle,
  modulesGridStyle,
  sectionTitleStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

function nombreUsuario(user: any) {
  const nombre = [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim();
  return nombre || user?.email || "Usuario";
}

function getTerritorios(user: any) {
  return Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento.filter((territorio: any) => String(territorio?.valor || "").trim())
    : [];
}

export default function AlojamientosInspectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const territorios = getTerritorios(user);

  return (
    <section style={cardStyle}>
      <header style={{ marginBottom: 18 }}>
        <h2 style={titleStyle}>Panel territorial</h2>
        <p style={subtitleStyle}>
          {nombreUsuario(user)} · Gestión territorial de alojamientos.
        </p>
      </header>

      <div style={infoGridStyle}>
        <div style={softCardStyle}>
          <h3 style={sectionTitleStyle}>Territorios asignados</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {territorios.map((territorio: any) => (
              <span key={`${territorio.tipo}:${territorio.valor}`} style={badgeStyle}>
                {territorio.tipo}: {territorio.valor}
              </span>
            ))}
          </div>
        </div>

        <div style={softCardStyle}>
          <h3 style={sectionTitleStyle}>Alcance</h3>
          <p style={{ ...metaStyle, margin: 0 }}>
            Este módulo opera separado de Mi Barrio y se limita a los territorios de alojamiento
            asignados.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={sectionTitleStyle}>Módulos</h3>
        <div style={modulesGridStyle}>
          <button
            type="button"
            onClick={() => navigate("/app/alojamientos-inspector/inventario")}
            style={moduleButtonStyle}
          >
            Inventario
            <div style={metaStyle}>Consulta territorial readonly</div>
          </button>
          <button
            type="button"
            onClick={() => navigate("/app/alojamientos-inspector/documentos")}
            style={moduleButtonStyle}
          >
            Documentos
            <div style={metaStyle}>Consulta documental readonly</div>
          </button>
        </div>
      </div>
    </section>
  );
}
