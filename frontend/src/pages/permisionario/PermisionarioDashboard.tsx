// frontend/src/pages/permisionario/PermisionarioDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

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
      // ✅ Traer TODO lo visible para el usuario, sin filtrar por código.
      // El backend ya resuelve visibilidad por creador/intervinientes/retrocompat.
      const res = await http.get("/formularios/mios");
      const list = Array.isArray(res.data?.anexos) ? res.data.anexos : [];
      setUltimaGestion(list[0] || null); // ya viene ordenado DESC por createdAt
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
    <div style={{ padding: 8 }}>
      <h1 style={{ marginTop: 0 }}>{tituloRol}</h1>

      <div style={{ padding: 12, border: "1px solid #ddd", background: "white", borderRadius: 10 }}>
        <div style={{ marginBottom: 8 }}>
          Usuario: {safe(user?.nombre)} {safe(user?.apellido)} — <b>{role}</b>
          {esInspector ? (
            <span>
              {" "}
              — <b>INSPECTOR</b>
            </span>
          ) : null}
        </div>

        <h3 style={{ margin: "10px 0 8px 0" }}>Alertas / Última gestión</h3>

        {loading ? (
          <p>Cargando…</p>
        ) : !ultimaGestion ? (
          <p>Sin gestiones recientes.</p>
        ) : (
          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <div>
              <b>{safe(ultimaGestion.codigo)}</b>{" "}
              <span style={{ opacity: 0.8 }}>
                ({safe(ultimaGestion.estado)}
                {ultimaGestion.estadoInstitucional ? ` / ${safe(ultimaGestion.estadoInstitucional)}` : ""})
              </span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Creado: {fmtDate(ultimaGestion.createdAt)} — Actualizado: {fmtDate(ultimaGestion.updatedAt)}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/app/permisionario/anexos")}>Ir a Mis Anexos</button>

              {esInspector ? (
                <button
                  onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}
                  style={{ fontWeight: 800 }}
                >
                  Ir a MI BARRIO - INSPECTOR
                </button>
              ) : null}
            </div>
          </div>
        )}

        <h3 style={{ margin: "14px 0 8px 0" }}>Módulos</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/app/permisionario/anexos")}>Mis anexos</button>

          {/* ✅ NUEVO MÓDULO (no menciona ANEXO_01) */}
          <button onClick={() => navigate("/app/permisionario/mis-datos")}>
            Mis datos declarados
          </button>

          <button onClick={() => navigate("/app/permisionario/comunicaciones")}>Mis comunicaciones</button>
          <button onClick={() => navigate("/app/permisionario/servicios")}>Mis servicios</button>
          <button onClick={() => navigate("/app/permisionario/liquidaciones")}>Mis liquidaciones</button>
          <button onClick={() => navigate("/app/permisionario/novedades")}>Novedades</button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Nota: La información de “Mis datos declarados” puede actualizarse cuando exista un cambio.
          Toda actualización queda registrada con fecha y hora.
        </div>
      </div>
    </div>
  );
}
