import React, { useMemo, useState } from "react";

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

  if (!items.length) return <p>Sin adjuntos.</p>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((a, idx) => {
        const nombre = a.nombre || `Adjunto ${idx + 1}`;
        const url = a.url;

        // Por seguridad: endpoint sirve attachment => no preview inline
        const canPreview = false;

        return (
          <div
            key={`${nombre}-${idx}`}
            style={{
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{nombre}</div>
                <div style={{ fontSize: 12, color: "#444" }}>
                  {a.tipo || "tipo?"} • {bytes(a.size)}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  <code>{a.ruta || "—"}</code>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {url ? (
                  <>
                    <a href={url} target="_blank" rel="noreferrer">
                      Ver
                    </a>
                    <a href={url}>
                      Descargar
                    </a>

                    {canPreview ? (
                      <button
                        type="button"
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                      >
                        {openIndex === idx ? "Ocultar" : "Previsualizar"}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <span style={{ color: "crimson" }}>
                    No se pudo generar URL segura
                  </span>
                )}
              </div>
            </div>

            {/* PREVIEW (deshabilitado por seguridad) */}
            {openIndex === idx && url ? (
              <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
                Por seguridad institucional, los adjuntos se descargan como <b>attachment</b> y no se
                previsualizan inline. Usá “Ver” o “Descargar”.
              </div>
            ) : null}

            {/* Mensaje adicional para tipos no previsualizables (mantiene UX existente) */}
            {openIndex === idx && url && !canPreview ? (
              <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
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
