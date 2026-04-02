// frontend/src/pages/permisionario/jefe/GestionesJefeBarrio.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  createdAt?: string;
  datos?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}
function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}
function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray((user as any)?.permisos) ? (user as any).permisos : [];
  return list.map(up).includes(up(permiso));
}
function unidadLabel(a: Anexo) {
  const d = a.datos || {};
  const u = typeof d.unidadHabitacional === "string" ? d.unidadHabitacional.trim() : "";
  const casa = typeof d.casa === "string" ? d.casa.trim() : "";
  const dir = typeof d.direccionUnidad === "string" ? d.direccionUnidad.trim() : "";
  if (u) return u;
  if (casa) return casa;
  if (dir) return dir;
  return "—";
}

export default function GestionesJefeBarrio() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const esJefe = role === "PERMISIONARIO" && hasPermiso(user, "JEFE_DE_BARRIO");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Anexo[]>([]);
  const [filtro, setFiltro] = useState<"TODOS" | "ANEXO_04" | "ANEXO_11">("TODOS");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [r04, r11] = await Promise.all([
        http.get("/formularios/mios", { params: { codigo: "ANEXO_04" } }),
        http.get("/formularios/mios", { params: { codigo: "ANEXO_11" } }),
      ]);

      const a04 = Array.isArray(r04.data?.anexos) ? (r04.data.anexos as Anexo[]) : [];
      const a11 = Array.isArray(r11.data?.anexos) ? (r11.data.anexos as Anexo[]) : [];

      const map = new Map<string, Anexo>();
      [...a04, ...a11].forEach((a) => map.set(a._id, a));

      const merged = Array.from(map.values()).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(merged);
    } catch (e) {
      console.error("[JEFE] Error cargando gestiones", e);
      setError("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!esJefe) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esJefe]);

  const visibles = useMemo(() => {
    if (filtro === "TODOS") return items;
    return items.filter((a) => up(a.codigo) === filtro);
  }, [items, filtro]);

  if (!esJefe) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al administrador.
      </div>
    );
  }

const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  textAlign: "left",
  padding: 8,
  color: "#9ca3af",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  padding: 8,
  color: "#ffffff",
};
  return (
  <div>
    <h2 style={{ marginTop: 0, color: "#ffffff" }}>
      Gestiones — Jefe de Barrio
    </h2>

    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      {/* BOTONES IZQUIERDA */}
      <button
        onClick={cargar}
        disabled={loading}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "#ffffff",
          cursor: "pointer",
        }}
      >
        Recargar
      </button>

      <button
        onClick={() =>
          navigate("/app/permisionario/mi-barrio-jefe")
        }
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "#ffffff",
          cursor: "pointer",
        }}
      >
        Volver
      </button>

      {/* FILTRO */}
      <div style={{ marginLeft: "auto" }}>
        <label
          style={{
            fontSize: 13,
            marginRight: 6,
            color: "#9ca3af",
          }}
        >
          Filtrar:
        </label>

        <select
          value={filtro}
          onChange={(e) =>
            setFiltro(e.target.value as any)
          }
          style={selectStyle}
        >
          <option value="TODOS" style={optionStyle}>
            Todos
          </option>
          <option value="ANEXO_04" style={optionStyle}>
            ANEXO_04
          </option>
          <option value="ANEXO_11" style={optionStyle}>
            ANEXO_11 (míos)
          </option>
        </select>
      </div>

      {/* BOTÓN PRINCIPAL */}
      <button
        onClick={() =>
          navigate(
            "/app/permisionario/mi-barrio-jefe/crear-anexo-11"
          )
        }
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(59,130,246,0.2)",
          color: "#ffffff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        + Nuevo ANEXO 11
      </button>
    </div>

    {/* ERROR */}
    {error ? (
      <div
        style={{
          padding: 10,
          border: "1px solid rgba(239,68,68,0.4)",
          background: "rgba(239,68,68,0.1)",
          color: "#fca5a5",
          borderRadius: 8,
        }}
      >
        {error}
      </div>
    ) : null}

    {/* LOADING */}
    {loading ? (
      <div style={{ color: "#9ca3af" }}>Cargando…</div>
    ) : null}

    {/* VACÍO */}
    {!loading && !error && visibles.length === 0 ? (
      <p style={{ color: "#9ca3af" }}>
        No se encontraron gestiones.
      </p>
    ) : null}

    {/* TABLA */}
    {!loading && !error && visibles.length > 0 ? (
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Código</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Unidad</th>
            <th style={thStyle}>Creado</th>
            <th style={thStyle}>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {visibles.map((a) => (
            <tr key={a._id}>
              <td style={tdStyle}>{safe(a.codigo)}</td>
              <td style={tdStyle}>{safe(a.estado)}</td>
              <td style={tdStyle}>{unidadLabel(a)}</td>
              <td style={tdStyle}>{fmtDate(a.createdAt)}</td>

              <td
                style={{
                  ...tdStyle,
                  textAlign: "center",
                }}
              >
                <button
                  onClick={() =>
                    navigate(
                      `/app/permisionario/mi-barrio-jefe/gestiones/${a._id}`
                    )
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Ver / Gestionar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : null}
  </div>
);
}
