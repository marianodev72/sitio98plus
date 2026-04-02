// frontend/src/pages/permisionario/PermisionarioDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
  heroStyle,
  infoRowStyle,
  metaStyle,
  moduleButtonStyle,
  modulesGridStyle,
  noteStyle,
  pageStyle,
  primaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  statusHeaderStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "./uiStyles";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  const p = up(perm);
  return list.map((x: any) => up(x)).includes(p);
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function PermisionarioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = up(user?.role);
  const esInspector = hasPerm(user, "INSPECTOR");

  const [loading, setLoading] = useState(false);
  const [ultimaGestion, setUltimaGestion] = useState<Anexo | null>(null);

  const tituloRol = useMemo(() => {
    return esInspector ? "Permisionario (cargo INSPECTOR)" : "Permisionario";
  }, [esInspector]);

  async function cargarResumen() {
    setLoading(true);
    try {
      const res = await http.get("/formularios/mios");
      const list = Array.isArray(res.data?.anexos) ? res.data.anexos : [];
      setUltimaGestion(list[0] || null);
    } catch {
      setUltimaGestion(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarResumen();
  }, []);

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>{tituloRol}</h1>
          <p style={subtitleStyle}>
            Panel principal para acceder a módulos, consultar la última gestión visible y revisar
            información general del usuario.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={infoRowStyle}>
            <span>
              Usuario: <b>{safe(user?.nombre)} {safe(user?.apellido)}</b>
            </span>
            <span>
              Rol: <b>{role}</b>
            </span>
            {esInspector ? (
              <span>
                Cargo adicional: <b>INSPECTOR</b>
              </span>
            ) : null}
          </div>

          <h3 style={sectionTitleStyle}>Alertas / Última gestión</h3>

          {loading ? (
            <div style={softCardStyle}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>Cargando…</p>
            </div>
          ) : !ultimaGestion ? (
            <div style={softCardStyle}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>
                Sin gestiones recientes.
              </p>
            </div>
          ) : (
            <div style={softCardStyle}>
              <div style={statusHeaderStyle}>
                <b style={{ fontSize: 16, color: "#ffffff" }}>{safe(ultimaGestion.codigo)}</b>
                <span style={badgeStyle}>{safe(ultimaGestion.estado)}</span>
                {ultimaGestion.estadoInstitucional ? (
                  <span style={badgeStyle}>{safe(ultimaGestion.estadoInstitucional)}</span>
                ) : null}
              </div>

              <div style={metaStyle}>
                Creado: {fmtDate(ultimaGestion.createdAt)} — Actualizado:{" "}
                {fmtDate(ultimaGestion.updatedAt)}
              </div>

              <div style={buttonRowStyle}>
                <button
                  style={primaryButtonStyle}
                  onClick={() => navigate("/app/permisionario/anexos")}
                >
                  Ir a Mis Anexos
                </button>

                {esInspector ? (
                  <button
                    style={successButtonStyle}
                    onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}
                  >
                    Ir a MI BARRIO - INSPECTOR
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <h3 style={{ ...sectionTitleStyle, marginTop: 22 }}>Módulos</h3>

          <div style={modulesGridStyle}>
            <button
              style={moduleButtonStyle}
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
              style={moduleButtonStyle}
              onClick={() => navigate("/app/permisionario/comunicaciones")}
            >
              Mis comunicaciones
            </button>

            <button
              style={moduleButtonStyle}
              onClick={() => navigate("/app/permisionario/servicios")}
            >
              Mis servicios
            </button>

            <button
              style={moduleButtonStyle}
              onClick={() => navigate("/app/permisionario/liquidaciones")}
            >
              Mis liquidaciones
            </button>
            <button
              style={moduleButtonStyle}
              onClick={() => navigate("/app/permisionario/mis-mantenimientos")}
            >
              Mis Mantenimientos
            </button>

            <button
              style={moduleButtonStyle}
              onClick={() => navigate("/app/permisionario/novedades")}
            >
              Novedades
            </button>
          </div>

          <div style={noteStyle}>
            Nota: La información de “Mis datos declarados” puede actualizarse cuando exista un
            cambio. Toda actualización queda registrada con fecha y hora.
          </div>
        </div>
      </div>
    </div>
  );
}