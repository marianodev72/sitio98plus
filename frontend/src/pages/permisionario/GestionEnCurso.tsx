// frontend/src/pages/permisionario/GestionEnCurso.tsx
import { useEffect, useState } from "react";
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
  datos?: any; // 👈 añadimos datos para poder mostrar vivienda / persona
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
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

// 👇 helpers similares a los de GestionesInspector

// Vivienda / unidad en formato amigable
function viviendaLabel(a: Anexo): string {
  const d = a.datos || {};
  const u =
    typeof d.unidadHabitacional === "string" ? d.unidadHabitacional.trim() : "";
  const casa = typeof d.casa === "string" ? d.casa.trim() : "";
  const vid = typeof d.viviendaId === "string" ? d.viviendaId : "";

  if (u) return u;        // ej: AB-414
  if (casa) return casa;  // compatibilidad
  if (vid) return vid;    // último recurso
  return "—";
}

// Nombre de persona: postulante / permisionario
function personaLabel(a: Anexo): string {
  const d = a.datos || {};
  if (typeof d.apellidoNombres === "string" && d.apellidoNombres.trim()) {
    return d.apellidoNombres.trim();
  }
  if (typeof d.permisionarioNombre === "string" && d.permisionarioNombre.trim()) {
    return d.permisionarioNombre.trim();
  }
  return "—";
}

export default function GestionEnCurso() {
  const { user } = useAuth();
  const role = up(user?.role);
  const navigate = useNavigate();

  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function cargar() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      const res = await http.get("/formularios/mios");
      const anexos = Array.isArray(res.data?.anexos) ? (res.data.anexos as Anexo[]) : [];
      const pendientes = anexos.filter((a) => {
        const est = up(a.estado);
        return est === "ENVIADO" || est === "EN_REVISION";
      });
      setItems(pendientes);
    } catch (e) {
      console.error("[GESTION EN CURSO] Error", e);
      setErrorMsg(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (role !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <h2>Gestión en curso</h2>

      {errorMsg ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #ccc",
            background: "#f7f7f7",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <button onClick={cargar} disabled={loading}>
          {loading ? "Cargando…" : "Actualizar"}
        </button>
        <span style={{ marginLeft: 12 }}>Pendientes: {items.length}</span>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 10,
          background: "white",
        }}
      >
        {loading ? (
          <p>Cargando…</p>
        ) : items.length === 0 ? (
          <p>No hay gestiones pendientes.</p>
        ) : (
          <table
            border={1}
            cellPadding={6}
            cellSpacing={0}
            style={{ width: "100%" }}
          >
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Vivienda / Unidad</th> {/* 👈 nueva columna */}
                <th>Postulante / Permisionario</th> {/* 👈 nueva columna */}
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((an) => (
                <tr key={an._id}>
                  <td>{safe(an.codigo)}</td>
                  <td>
                    {safe(an.estado)}
                    {an.estadoInstitucional
                      ? ` / ${safe(an.estadoInstitucional)}`
                      : ""}
                  </td>
                  <td>{viviendaLabel(an)}</td>
                  <td>{personaLabel(an)}</td>
                  <td>{fmtDate(an.updatedAt || an.createdAt)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      onClick={() =>
                        navigate(`/app/permisionario/anexos/${an._id}`)
                      }
                    >
                      Abrir
                    </button>{" "}
                    <a
                      href={`/api/formularios/${an._id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
