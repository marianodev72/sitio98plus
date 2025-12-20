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

function toPublicUrl(ruta?: string) {
  if (!ruta) return null;

  const p = String(ruta).replace(/\\/g, "/");

  // Caso ideal: contiene /uploads/
  const idx = p.toLowerCase().indexOf("/uploads/");
  if (idx >= 0) return p.slice(idx);

  // Caso: empieza con uploads/
  if (p.toLowerCase().startsWith("uploads/")) return "/" + p;

  // Caso: solo filename en UPLOADS (poco común)
  // Si tus adjuntos quedan en /uploads/formularios/<file>
  const file = p.split("/").pop();
  if (file) return `/uploads/formularios/${file}`;

  return null;
}

function isImage(mime?: string) {
  return !!mime && mime.startsWith("image/");
}
function isPdf(mime?: string) {
  return mime === "application/pdf";
}

export default function AdjuntosList({ adjuntos }: { adjuntos: Adjunto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = useMemo(() => {
    return (Array.isArray(adjuntos) ? adjuntos : []).map((a) => {
      const url = toPublicUrl(a.ruta);
      return { ...a, url };
    });
  }, [adjuntos]);

  if (!items.length) return <p>Sin adjuntos.</p>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((a, idx) => {
        const nombre = a.nombre || `Adjunto ${idx + 1}`;
        const url = a.url ? `http://localhost:3000${a.url}` : null;

        const canPreview = !!url && (isPdf(a.tipo) || isImage(a.tipo));

        return (
          <div
            key={`${a.ruta || nombre}-${idx}`}
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
                    <a href={url} download>
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
                    No se pudo generar URL pública
                  </span>
                )}
              </div>
            </div>

            {/* PREVIEW */}
            {openIndex === idx && url && isImage(a.tipo) ? (
              <div style={{ marginTop: 10 }}>
                <img
                  src={url}
                  alt={nombre}
                  style={{
                    maxWidth: "100%",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            ) : null}

            {openIndex === idx && url && isPdf(a.tipo) ? (
              <div style={{ marginTop: 10 }}>
                <iframe
                  title={nombre}
                  src={url}
                  style={{
                    width: "100%",
                    height: 520,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                />
              </div>
            ) : null}

            {/* Para DOCX/XLSX: explicamos por qué no hay preview */}
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
