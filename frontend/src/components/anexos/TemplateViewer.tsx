// frontend/src/components/anexos/TemplateViewer.tsx
import { useEffect, useState } from "react";
import { http } from "../../api/http";

type Opcion =
  | string
  | {
      valor: string;
      etiqueta: string;
    };

type Campo = {
  nombre: string;
  etiqueta: string;
  tipo: "text" | "textarea" | "select" | "date" | "checkbox" | string;
  requerido: boolean;
  ayuda?: string;
  opciones?: Opcion[];
};

type Template = {
  code: string;
  nombre?: string;
  descripcion?: string;
  campos: Campo[];
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function yn(v: any) {
  if (v === true) return "SI";
  if (v === false) return "NO";
  const s = up(v);
  if (s === "SI" || s === "SÍ") return "SI";
  if (s === "NO") return "NO";
  return v ?? "—";
}

function isEmptyValue(v: any) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

// ---- NUEVO: valor "amigable" para ciertos campos técnicos ----
function getDisplayValue(campo: Campo, datos: any) {
  const raw = datos?.[campo.nombre];

  // Vivienda: priorizamos código/casa/dirección en lugar del ObjectId
  if (campo.nombre === "viviendaId") {
    const unidad =
      (typeof datos?.unidadHabitacional === "string" &&
        datos.unidadHabitacional.trim()) ||
      (typeof datos?.casa === "string" && datos.casa.trim()) ||
      "";

    const direccion =
      typeof datos?.direccion === "string" ? datos.direccion.trim() : "";
    const localidad =
      typeof datos?.localidad === "string" ? datos.localidad.trim() : "";

    if (unidad) return unidad; // ej: AB-414
    if (direccion || localidad) {
      const txt = `${direccion} ${localidad}`.trim();
      if (txt) return txt;
    }
    return raw;
  }

  // Postulante / Permisionario: apellido y nombres
  if (campo.nombre === "postulanteId" || campo.nombre === "permisionarioId") {
    const nombre1 =
      typeof datos?.apellidoNombres === "string"
        ? datos.apellidoNombres.trim()
        : "";
    const nombre2 =
      typeof datos?.permisionarioNombre === "string"
        ? datos.permisionarioNombre.trim()
        : "";

    if (nombre1) return nombre1;
    if (nombre2) return nombre2;
    return raw;
  }

  // Por defecto devolvemos el valor original
  return raw;
}

function renderValue(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return yn(v);
  if (typeof v === "string" || typeof v === "number") return String(v);

  // Arrays: tabla simple si son objetos, lista si son primitivos
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";

    const allObjects = v.every((x) => x && typeof x === "object" && !Array.isArray(x));
    if (!allObjects) {
      return (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {v.map((x, i) => (
            <li key={i}>{String(x)}</li>
          ))}
        </ul>
      );
    }

    const keys = Array.from(
      new Set(v.flatMap((obj) => Object.keys(obj || {})))
    );

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {keys.map((k) => (
                <th
                  key={k}
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    padding: 6,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.map((obj, idx) => (
              <tr key={idx}>
                {keys.map((k) => (
                  <td
                    key={`${idx}-${k}`}
                    style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}
                  >
                    {renderValue(obj?.[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Objects: json “bonito”
  if (typeof v === "object") {
    return (
      <pre
        style={{
          background: "#f7f7f7",
          padding: 12,
          borderRadius: 8,
          overflowX: "auto",
          margin: 0,
        }}
      >
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }

  return String(v);
}

export default function TemplateViewer({
  codigo,
  datos,
}: {
  codigo: string;
  datos: any;
}) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setError(null);
      try {
        const res = await http.get(`/templates/${codigo}`);
        const t = res.data?.template || res.data;
        if (!t || !Array.isArray(t.campos)) throw new Error("Template inválido");
        if (mounted) setTemplate(t);
      } catch {
        if (mounted) setError("No se pudo cargar la plantilla del anexo.");
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [codigo]);

  if (error) {
    return (
      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <p style={{ margin: 0, color: "crimson" }}>{error}</p>
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          Se muestra vista básica:
        </p>
        <pre
          style={{
            background: "#f7f7f7",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(datos || {}, null, 2)}
        </pre>
      </div>
    );
  }

  if (!template) return <div style={{ padding: 12 }}>Cargando plantilla…</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h3 style={{ margin: 0 }}>{template.nombre || codigo}</h3>
        {template.descripcion ? (
          <p style={{ marginTop: 6, color: "#444" }}>{template.descripcion}</p>
        ) : null}
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10 }}>
        <div style={{ padding: 12 }}>
          {template.campos.map((c) => {
            const v = getDisplayValue(c, datos);

            return (
              <div
                key={c.nombre}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {c.etiqueta}
                  {c.requerido ? " *" : ""}
                </div>

                {c.ayuda ? (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                    {c.ayuda}
                  </div>
                ) : null}

                <div style={{ marginTop: 6 }}>
                  {isEmptyValue(v) ? "—" : renderValue(v)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
