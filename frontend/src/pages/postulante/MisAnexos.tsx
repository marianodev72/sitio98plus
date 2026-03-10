// frontend/src/pages/postulante/MisAnexos.tsx
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
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
}

export default function MisAnexos() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = up(user?.role);

  // En esta etapa necesitamos que el usuario pueda ver ANEXO_02 siempre.
  // Permitimos listar anexos relevantes (podés ampliar después).
  const CODIGOS = useMemo(() => ["ANEXO_01", "ANEXO_02", "ANEXO_03"], []);
  const [codigo, setCodigo] = useState<string>("ANEXO_02");

  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function cargar() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      const res = await http.get("/formularios/mios", { params: { codigo } });
      setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
    } catch (e) {
      console.error("[MIS ANEXOS] Error", e);
      setErrorMsg(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf(id: string, cod: string) {
    setErrorMsg("");
    try {
      const res = await http.get(`/formularios/${id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_${cod}_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[MIS ANEXOS] Error PDF", e);
      setErrorMsg(
        "La operación solicitada no está disponible. Por favor, contacte al administrador."
      );
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  // Permitimos POSTULANTE y PERMISIONARIO (en espera) para que pueda consultar ANEXO_02 cerrado.
  if (role !== "POSTULANTE" && role !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Mis anexos</h2>

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

      <section style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd" }}>
        <select
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          disabled={loading}
        >
          {CODIGOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button type="button" onClick={cargar} disabled={loading} style={{ marginLeft: 8 }}>
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
                    {an.estadoInstitucional ? ` / ${safe(an.estadoInstitucional)}` : ""}
                  </td>
                  <td>{fmtDate(an.createdAt)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {/* ✅ RUTA CORRECTA SEGÚN RoleRoutes:
                        /app/postulante/mis-anexos/:id */}
                    <button
                      type="button"
                      onClick={() => navigate(`/app/postulante/mis-anexos/${an._id}`)}
                    >
                      Ver
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() => descargarPdf(an._id, up(an.codigo))}
                    >
                      PDF
                    </button>
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
