// frontend/src/pages/postulante/MisAnexos.tsx
import { CSSProperties, useEffect, useMemo, useState } from "react";
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

const pageStyle: CSSProperties = {
  padding: 24,
  color: "#F8FAFC",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 12,
  padding: 16,
};

const deniedStyle: CSSProperties = {
  padding: 32,
  color: "#F8FAFC",
};

const selectStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

const neutralButtonStyle: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "rgba(255,255,255,0.02)",
};

const headerCellStyle: CSSProperties = {
  color: "#9CA3AF",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  padding: 10,
  textAlign: "left",
};

const cellStyle: CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  padding: 10,
  color: "#F8FAFC",
  verticalAlign: "top",
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
  const CODIGOS = useMemo(() => ["ANEXO_01", "ANEXO_02", "ANEXO_03", "ANEXO_21"], []);
  const [codigo, setCodigo] = useState<string>("ANEXO_02");

  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function cargar() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      if (codigo === "ANEXO_21") {
        const res = await http.get("/alojamientos-documentos", { params: { codigo: "ANEXO_21" } });
        setItems(Array.isArray(res.data?.documentos) ? res.data.documentos : []);
      } else {
        const res = await http.get("/formularios/mios", { params: { codigo } });
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      }
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
      <div style={deniedStyle}>
        <h2 style={{ marginTop: 0, color: "#F8FAFC" }}>
          La página solicitada no está disponible.
        </h2>
        <p style={{ color: "#CBD5E1" }}>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h2 style={{ marginTop: 0, color: "#F8FAFC" }}>Mis anexos</h2>

      {errorMsg ? (
        <div
          style={{
            ...cardStyle,
            marginBottom: 12,
            background: "rgba(127,29,29,0.18)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#FCA5A5",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <section
        style={{
          ...cardStyle,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <select
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          disabled={loading}
          style={selectStyle}
        >
          {CODIGOS.map((c) => (
            <option key={c} value={c} style={optionStyle}>
              {c}
            </option>
          ))}
        </select>

        <button type="button" onClick={cargar} disabled={loading} style={neutralButtonStyle}>
          {loading ? "Cargando…" : "Actualizar"}
        </button>

        <span style={{ color: "#CBD5E1" }}>Resultados: {items.length}</span>
      </section>

      <section style={cardStyle}>
        {loading ? (
          <p style={{ margin: 0, color: "#CBD5E1" }}>Cargando anexos…</p>
        ) : items.length === 0 ? (
          <p style={{ margin: 0, color: "#CBD5E1" }}>No hay anexos.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Código</th>
                  <th style={headerCellStyle}>Estado</th>
                  <th style={headerCellStyle}>Fecha</th>
                  <th style={headerCellStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((an) => (
                  <tr key={an._id}>
                    <td style={cellStyle}>{safe(an.codigo)}</td>
                    <td style={cellStyle}>
                      {safe(an.estado)}
                      {an.estadoInstitucional ? ` / ${safe(an.estadoInstitucional)}` : ""}
                    </td>
                    <td style={cellStyle}>{fmtDate(an.createdAt)}</td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {/* ✅ RUTA CORRECTA SEGÚN RoleRoutes:
                          /app/postulante/mis-anexos/:id */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {up(an.codigo) === "ANEXO_21" ? (
                          <button
                            type="button"
                            style={neutralButtonStyle}
                            onClick={() => navigate(`/app/postulante/mis-anexos/alojamientos/${an._id}`)}
                          >
                            Ver
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              style={neutralButtonStyle}
                              onClick={() => navigate(`/app/postulante/mis-anexos/${an._id}`)}
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              style={neutralButtonStyle}
                              onClick={() => descargarPdf(an._id, up(an.codigo))}
                            >
                              PDF
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
