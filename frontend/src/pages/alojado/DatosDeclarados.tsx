import { type ReactNode, useEffect, useState } from "react";
import http from "../../api/http";

type DatosDeclarados = {
  identidad?: {
    nombreCompleto?: string;
    apellido?: string;
    nombres?: string;
    genero?: string;
    gradoEscalafon?: string;
  };
  destino?: {
    actual?: string;
    futuro?: string;
  };
  ocupacion?: {
    estado?: string;
    fechaInicio?: string | null;
  };
  alojamiento?: {
    codigo?: string;
    lugar?: string;
    dependencia?: string;
    sector?: string;
    tipo?: string;
    clase?: string;
  };
  plaza?: {
    numero?: number | string | null;
    codigoPublico?: string;
  };
  origenDocumental?: {
    codigo?: string;
    estado?: string;
    fecha?: string | null;
  } | null;
};

function fmt(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fmt(value);
  return date.toLocaleDateString("es-AR");
}

const sectionStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "clamp(14px, 2vw, 20px)",
} as const;

const badgeStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "4px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 800,
} as const;

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
        {fmt(value)}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

export default function DatosDeclaradosAlojado() {
  const [datos, setDatos] = useState<DatosDeclarados | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await http.get("/alojamientos-mi/datos-declarados");
        if (!alive) return;
        setDatos(res.data?.datos || null);
      } catch (err: any) {
        if (!alive) return;
        setDatos(null);
        setError(err?.response?.data?.message || "No se pudieron obtener los datos declarados.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const identidad = datos?.identidad || {};
  const destino = datos?.destino || {};
  const ocupacion = datos?.ocupacion || {};
  const alojamiento = datos?.alojamiento || {};
  const plaza = datos?.plaza || {};
  const origen = datos?.origenDocumental || null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={sectionStyle}>
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
          Panel ALOJADO
        </p>
        <h1 style={{ margin: 0, color: "#ffffff", fontSize: "clamp(24px, 3vw, 34px)" }}>
          Mis datos
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
          Consulta readonly de datos institucionales declarados para alojamientos.
        </p>
      </section>

      {loading ? (
        <section style={sectionStyle}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando datos...</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section style={{ ...sectionStyle, borderColor: "rgba(248,113,113,0.45)" }}>
          <p style={{ margin: 0, color: "#fecaca", fontWeight: 800 }}>{error}</p>
        </section>
      ) : null}

      {!loading && !error && !datos ? (
        <section style={sectionStyle}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
            No hay datos declarados disponibles.
          </p>
        </section>
      ) : null}

      {!loading && !error && datos ? (
        <>
          <Section title="Identidad institucional">
            <Field label="Nombre completo" value={identidad.nombreCompleto} />
            <Field label="Apellido" value={identidad.apellido} />
            <Field label="Nombres" value={identidad.nombres} />
            <Field label="Genero" value={identidad.genero} />
            <Field label="Grado / escalafon" value={identidad.gradoEscalafon} />
          </Section>

          <Section title="Destino">
            <Field label="Actual" value={destino.actual} />
            <Field label="Futuro" value={destino.futuro} />
          </Section>

          <Section title="Ocupacion actual">
            <Field label="Estado" value={ocupacion.estado} />
            <Field label="Fecha inicio" value={fmtDate(ocupacion.fechaInicio)} />
          </Section>

          <Section title="Alojamiento / Plaza">
            <Field label="Alojamiento" value={alojamiento.codigo} />
            <Field label="Lugar" value={alojamiento.lugar} />
            <Field label="Dependencia" value={alojamiento.dependencia} />
            <Field label="Sector" value={alojamiento.sector} />
            <Field label="Tipo" value={alojamiento.tipo} />
            <Field label="Clase" value={alojamiento.clase} />
            <Field label="Plaza" value={plaza.numero ? `Plaza ${plaza.numero}` : ""} />
            <Field label="Codigo publico plaza" value={plaza.codigoPublico} />
          </Section>

          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>Origen documental</h2>
            {origen ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <strong style={{ color: "#ffffff" }}>{fmt(origen.codigo)}</strong>
                <span style={badgeStyle}>{fmt(origen.estado)}</span>
                <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: 800 }}>
                  Fecha: {fmtDate(origen.fecha)}
                </span>
              </div>
            ) : (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
                Sin origen documental disponible.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
