import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMantenimiento,
  MantenimientoItem,
  urlConstanciaPdf,
  urlDownloadAdjunto,
  urlPreviewAdjunto,
} from "../../api/mantenimientos";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

function badgeStyle(value: string) {
  const v = String(value || "").toUpperCase().trim();
  const base = { padding: "2px 8px", borderRadius: 999, fontWeight: 800, fontSize: 12, border: "1px solid #e5e5e5" } as const;
  if (v === "SI") return { ...base, background: "#e9ffe9" };
  if (v === "NO") return { ...base, background: "#ffe9e9" };
  return { ...base, background: "#f4f4f4" };
}

export default function MisMantenimientosDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState<MantenimientoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const d = await getMantenimiento(id);
        if (!alive) return;
        setItem(d);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || GENERIC_UI_ERROR);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  function openPreview(fileId: string) {
    if (!id) return;
    window.open(urlPreviewAdjunto(id, fileId), "_blank", "noopener,noreferrer");
  }
  function download(fileId: string) {
    if (!id) return;
    window.location.href = urlDownloadAdjunto(id, fileId);
  }
  function descargarConstancia() {
    if (!id) return;
    window.location.href = urlConstanciaPdf(id);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>Detalle de mantenimiento</h2>
          <p style={{ opacity: 0.85 }}>Adjuntos e historial (solo lectura).</p>
        </div>
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>

      {error ? (
        <div style={{ marginTop: 12, padding: 10, background: "#fff3f3", border: "1px solid #ffd1d1", borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 12, opacity: 0.85 }}>Cargando…</div>
      ) : !item ? (
        <div style={{ marginTop: 12, opacity: 0.85 }}>No disponible.</div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><b>Vivienda:</b> {item.viviendaDisplay}</div>
              <div><b>Permisionario:</b> {item.permisionarioDisplay}</div>
              <div><b>Tipo:</b> {item.tipoMantenimiento}</div>
              <div><b>Enviado:</b> {new Date(item.submittedAt).toLocaleString()}</div>
              <div><b>Inspector:</b> <span style={badgeStyle(item.inspectorDecision)}>{item.inspectorDecision}</span></div>
              <div>
                <b>Admin:</b>{" "}
                <span style={badgeStyle(item.adminDecision)}>
                  {item.adminDecision === "SI" && item.isClosed ? "SI Y CERRADO" : item.adminDecision}
                </span>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><b>Técnico:</b> {item.tecnicoInterviniente || "—"}</div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={descargarConstancia}>Descargar constancia (PDF)</button>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Adjuntos</h3>
            {item.adjuntos?.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f6f6f6" }}>
                    <th style={{ textAlign: "left", padding: 10 }}>Archivo</th>
                    <th style={{ textAlign: "left", padding: 10 }}>Tamaño</th>
                    <th style={{ textAlign: "left", padding: 10 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {item.adjuntos.map((a) => (
                    <tr key={String(a.fileId)} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: 10 }}>{a.nombre || "documento.pdf"}</td>
                      <td style={{ padding: 10 }}>{Math.round((a.size || 0) / 1024)} KB</td>
                      <td style={{ padding: 10 }}>
                        <button onClick={() => openPreview(String(a.fileId))}>Preview</button>{" "}
                        <button onClick={() => download(String(a.fileId))}>Descargar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ opacity: 0.85 }}>No hay adjuntos.</div>
            )}
          </div>

          <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 10, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Historial de intervenciones</h3>
            {item.intervenciones?.length ? (
              <ul>
                {item.intervenciones.map((h, idx) => (
                  <li key={idx}>
                    <b>{h.actorRole}</b> — {h.actorNombre} — {new Date(h.fecha).toLocaleString()} — {h.accion} ({h.resultado})
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ opacity: 0.85 }}>Sin intervenciones registradas.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
