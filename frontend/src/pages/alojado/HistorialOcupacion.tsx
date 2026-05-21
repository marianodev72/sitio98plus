import { useEffect, useState } from "react";
import http from "../../api/http";

type Ocupacion = {
  estado?: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  alojamiento?: {
    codigo?: string;
    lugar?: string;
    dependencia?: string;
    sector?: string;
    tipo?: string;
    clase?: string;
  };
  plaza?: {
    numero?: number | null;
    codigoPublico?: string;
  };
  origenDocumental?: {
    codigo?: string;
    estado?: string;
    fecha?: string | null;
  } | null;
};

const sectionStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "clamp(14px, 2vw, 20px)",
};

const badgeStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "4px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 800,
} as const;

function safe(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: 12,
        background: "rgba(255,255,255,0.045)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, color: "#ffffff", fontWeight: 800, wordBreak: "break-word" }}>
        {safe(value)}
      </div>
    </div>
  );
}

export default function HistorialOcupacionAlojado() {
  const [ocupaciones, setOcupaciones] = useState<Ocupacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await http.get("/alojamientos-mi/ocupaciones");
        if (!alive) return;
        setOcupaciones(Array.isArray(res.data?.ocupaciones) ? res.data.ocupaciones : []);
      } catch {
        if (!alive) return;
        setOcupaciones([]);
        setError("No se pudo obtener el historial de ocupacion.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={sectionStyle}>
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
          Panel ALOJADO
        </p>
        <h1 style={{ margin: 0, color: "#ffffff", fontSize: "clamp(24px, 3vw, 34px)" }}>
          Historial de ocupacion
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
          Consulta readonly de ocupaciones propias registradas.
        </p>
      </section>

      <section style={sectionStyle}>
        {loading ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando historial...</p>
        ) : error ? (
          <div
            style={{
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(127,29,29,0.22)",
              color: "#fecaca",
              borderRadius: 10,
              padding: 12,
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        ) : ocupaciones.length === 0 ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
            No hay ocupaciones registradas.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {ocupaciones.map((ocupacion, index) => {
              const alojamiento = ocupacion.alojamiento || {};
              const plaza = ocupacion.plaza || {};
              const origen = ocupacion.origenDocumental || {};
              const tipoClase = [alojamiento.tipo, alojamiento.clase].filter(Boolean).join(" / ");

              return (
                <article key={`${ocupacion.estado || "ocupacion"}-${index}`} style={sectionStyle}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                    <strong style={{ color: "#ffffff" }}>{safe(alojamiento.codigo)}</strong>
                    <span style={badgeStyle}>{safe(ocupacion.estado)}</span>
                    {origen.codigo ? <span style={badgeStyle}>{safe(origen.codigo)}</span> : null}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <Field label="Fecha inicio" value={fmtDate(ocupacion.fechaInicio)} />
                    <Field label="Fecha fin" value={fmtDate(ocupacion.fechaFin)} />
                    <Field label="Lugar" value={alojamiento.lugar} />
                    <Field label="Dependencia" value={alojamiento.dependencia} />
                    <Field label="Sector" value={alojamiento.sector} />
                    <Field label="Tipo / clase" value={tipoClase} />
                    <Field label="Plaza" value={plaza.numero ? `Plaza ${plaza.numero}` : plaza.codigoPublico} />
                    <Field label="Documento" value={origen.codigo} />
                    <Field label="Estado documental" value={origen.estado} />
                    <Field label="Fecha documental" value={fmtDate(origen.fecha)} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
