// frontend/src/components/AdjuntosList.tsx
import React, { useMemo, useState, type CSSProperties } from "react";

type Adjunto = {
  nombre?: string;
  ruta?: string;
  tipo?: string;
  size?: number;
};

function bytes(n?: number) {
  if (!n || Number.isNaN(n)) return "—";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function isImage(mime?: string) {
  return !!mime && mime.startsWith("image/");
}
function isPdf(mime?: string) {
  return mime === "application/pdf";
}

/**
 * BLOQUE 5.1 (migración): NO usar uploads static
 * Descarga segura via endpoint:
 *   GET /api/formularios/:id/adjuntos/:fileId
 *
 * Nota: el endpoint devuelve Content-Disposition: attachment,
 * por lo que NO se hace preview inline (iframe/img) para evitar bypass.
 */
export default function AdjuntosList({
  adjuntos,
  formularioId,
}: {
  adjuntos: Adjunto[];
  formularioId: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = useMemo(() => {
    return (Array.isArray(adjuntos) ? adjuntos : []).map((a, idx) => {
      const url = `/api/formularios/${formularioId}/adjuntos/${idx}`;
      return { ...a, url };
    });
  }, [adjuntos, formularioId]);

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
    color: "#eaf0ff",
  };

  const actionLinkStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
  };

  const hintStyle: CSSProperties = {
    marginTop: 10,
    fontSize: 13,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.5,
  };

  if (!items.length) {
    return <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>Sin adjuntos.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((a, idx) => {
        const nombre = a.nombre || `Adjunto ${idx + 1}`;
        const url = (a as Adjunto & { url?: string }).url;

        // Por seguridad: endpoint sirve attachment => no preview inline
        const canPreview = false;

        return (
          <div key={`${nombre}-${idx}`} style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: "#ffffff" }}>{nombre}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                  {a.tipo || "tipo?"} • {bytes(a.size)}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 4 }}>
                  <code>{a.ruta || "—"}</code>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {url ? (
                  <>
                    <a href={url} target="_blank" rel="noreferrer" style={actionLinkStyle}>
                      Ver
                    </a>
                    <a href={url} style={actionLinkStyle}>
                      Descargar
                    </a>

                    {canPreview ? (
                      <button
                        type="button"
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        style={{
                          ...actionLinkStyle,
                          cursor: "pointer",
                        }}
                      >
                        {openIndex === idx ? "Ocultar" : "Previsualizar"}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <span style={{ color: "#fecaca" }}>No se pudo generar URL segura</span>
                )}
              </div>
            </div>

            {openIndex === idx && url ? (
              <div style={hintStyle}>
                Por seguridad institucional, los adjuntos se descargan como <b>attachment</b> y no se
                previsualizan inline. Usá “Ver” o “Descargar”.
              </div>
            ) : null}

            {openIndex === idx && url && !canPreview ? (
              <div style={hintStyle}>
                Este tipo de archivo normalmente no se previsualiza en el navegador.
                Usá “Ver” o “Descargar”.
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}