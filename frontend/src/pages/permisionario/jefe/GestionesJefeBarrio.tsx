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

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Gestiones — Jefe de Barrio</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button onClick={cargar} disabled={loading}>Recargar</button>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")}>Volver</button>

        <div style={{ marginLeft: "auto" }}>
          <label style={{ fontSize: 13, marginRight: 6 }}>Filtrar:</label>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)}>
            <option value="TODOS">Todos</option>
            <option value="ANEXO_04">ANEXO_04</option>
            <option value="ANEXO_11">ANEXO_11 (míos)</option>
          </select>
        </div>

        <button
          onClick={() => navigate("/app/permisionario/mi-barrio-jefe/crear-anexo-11")}
          style={{ fontWeight: 800 }}
        >
          + Nuevo ANEXO 11
        </button>
      </div>

      {error ? <div style={{ padding: 10, border: "1px solid #f44336", background: "#ffebee" }}>{error}</div> : null}
      {loading ? <div>Cargando…</div> : null}

      {!loading && !error && visibles.length === 0 ? <p>No se encontraron gestiones.</p> : null}

      {!loading && !error && visibles.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Código</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Estado</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Unidad</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Creado</th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 6 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a._id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{safe(a.codigo)}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{safe(a.estado)}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{unidadLabel(a)}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{fmtDate(a.createdAt)}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 6, textAlign: "center" }}>
                  <button onClick={() => navigate(`/app/permisionario/mi-barrio-jefe/gestiones/${a._id}`)}>
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
