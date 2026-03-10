// frontend/src/pages/admin/GestionesAdmin.tsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
  usuario?: {
    _id?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    role?: string;
  };
};

type Panel = "PERMISIONARIOS" | "ALOJADOS";

const ANEXOS_PERMISIONARIO = [
  "ANEXO_01",
  "ANEXO_02",
  "ANEXO_03",
  "ANEXO_04",
  "ANEXO_07",
  "ANEXO_08",
  "ANEXO_09",
  "ANEXO_11",
];

const ANEXOS_ALOJADO = ["ANEXO_21", "ANEXO_22", "ANEXO_23", "ANEXO_24", "ANEXO_25", "ANEXO_26", "ANEXO_28"];

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function safeFileNameDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function viviendaLabel(a: Anexo): string {

  // ✅ 1) Prioridad absoluta: viviendaCodigo en el nivel superior
  if (
    typeof (a as any).viviendaCodigo === "string" &&
    (a as any).viviendaCodigo.trim()
  ) {
    return (a as any).viviendaCodigo.trim();
  }

  const d = a.datos || {};

  // ✅ 2) Código hidratado dentro de datos
  const codigo =
    typeof d.viviendaCodigo === "string" ? d.viviendaCodigo.trim() : "";
  if (codigo) return codigo;

  // ✅ 3) Label legacy
  const label =
    typeof d.viviendaLabel === "string" ? d.viviendaLabel.trim() : "";
  if (label) return label;

  // ✅ 4) Campos antiguos
  const unidad =
    typeof d.unidadHabitacional === "string" ? d.unidadHabitacional.trim() : "";
  const casa =
    typeof d.casa === "string" ? d.casa.trim() : "";
  const vid =
    typeof d.viviendaId === "string" ? d.viviendaId : "";

  if (unidad) return unidad;
  if (casa) return casa;

  // ❗ No mostrar ObjectId crudo
  const pareceObjectId =
    typeof vid === "string" && /^[a-fA-F0-9]{24}$/.test(vid);
  if (vid && !pareceObjectId) return vid;

  return "—";
}

function personaLabel(a: Anexo): string {
  const d = a.datos || {};

  if (typeof d.apellidoNombres === "string" && d.apellidoNombres.trim()) return d.apellidoNombres.trim();
  if (typeof d.permisionarioNombre === "string" && d.permisionarioNombre.trim()) return d.permisionarioNombre.trim();
  if (typeof d.postulanteNombre === "string" && d.postulanteNombre.trim()) return d.postulanteNombre.trim();
  if (typeof d.titularNombre === "string" && d.titularNombre.trim()) return d.titularNombre.trim();

  const ape = a.usuario?.apellido ? String(a.usuario.apellido).trim() : "";
  const nom = a.usuario?.nombre ? String(a.usuario.nombre).trim() : "";
  const full = `${ape} ${nom}`.trim();
  return full || "—";
}

export default function GestionesAdmin() {
  const { user } = useAuth();

  const [panel, setPanel] = useState<Panel>("PERMISIONARIOS");
  const anexosDisponibles = useMemo(
    () => (panel === "PERMISIONARIOS" ? ANEXOS_PERMISIONARIO : ANEXOS_ALOJADO),
    [panel]
  );

  const [codigo, setCodigo] = useState<string>(ANEXOS_PERMISIONARIO[0]);
  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const myRole = up(user?.role);
  const esAdmin = myRole === "ADMIN" || myRole === "ADMIN_GENERAL";

  useEffect(() => {
    const first = panel === "PERMISIONARIOS" ? ANEXOS_PERMISIONARIO[0] : ANEXOS_ALOJADO[0];
    setCodigo(first);
  }, [panel]);

  async function cargarLista() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      if (!codigo) return;

      if (esAdmin) {
        const res = await http.get(`/formularios/anexo/${codigo}`);
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      } else {
        const res = await http.get(`/formularios/mios`, { params: { codigo } });
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      }
    } catch (err) {
      console.error("[GESTIONES][ADMIN] Error listando", err);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf(id: string, cod: string) {
    setBusyId(id);
    setErrorMsg("");

    try {
      const res = await http.get(`/formularios/${id}/pdf`, { responseType: "blob" });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_${cod}_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[GESTIONES][ADMIN] Error PDF", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    cargarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, esAdmin]);

  return (
    <>
      <h1>Gestiones — ADMIN (solo lectura)</h1>

      <section style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setPanel("PERMISIONARIOS")}
          style={{ background: panel === "PERMISIONARIOS" ? "#eee" : "white" }}
        >
          Permisionarios
        </button>
        <button onClick={() => setPanel("ALOJADOS")} style={{ background: panel === "ALOJADOS" ? "#eee" : "white" }}>
          Alojados
        </button>
      </section>

      {errorMsg ? (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #ccc", background: "#f7f7f7" }}>
          {errorMsg}
        </div>
      ) : null}

      <section style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd" }}>
        <select value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={loading}>
          {anexosDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button onClick={cargarLista} disabled={loading} style={{ marginLeft: 8 }}>
          {loading ? "Cargando…" : "Actualizar"}
        </button>

        <span style={{ marginLeft: 12 }}>Resultados: {items.length}</span>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        {loading ? (
          <p>Cargando anexos…</p>
        ) : items.length === 0 ? (
          <p>No hay anexos.</p>
        ) : (
          <table border={1} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Vivienda / Unidad</th>
                <th>Postulante / Permisionario</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((an) => {
                const busy = busyId === an._id;

                return (
                  <tr key={an._id}>
                    <td>{safe(an.codigo)}</td>
                    <td>
                      {safe(an.estado)}
                      {an.estadoInstitucional ? ` / ${safe(an.estadoInstitucional)}` : ""}
                    </td>
                    <td>{viviendaLabel(an)}</td>
                    <td>{personaLabel(an)}</td>
                    <td>{fmtDate(an.updatedAt || an.createdAt)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button disabled={busy} onClick={() => descargarPdf(an._id, up(an.codigo))}>
                        PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
