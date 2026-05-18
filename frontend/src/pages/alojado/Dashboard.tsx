import { useEffect, useState } from "react";
import http from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type OcupacionActual = {
  estado?: string;
  fechaInicio?: string | null;
  codigoAsignacion?: string;
  alojamiento?: {
    codigo?: string;
    dependencia?: string;
    lugar?: string;
    sector?: string;
    tipo?: string;
    clase?: string;
    localidad?: string;
    provincia?: string;
  };
  plaza?: {
    codigo?: string;
    numero?: number | null;
    estado?: string;
    generoPermitido?: string;
  };
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

export default function AlojadoDashboard() {
  const { user } = useAuth();
  const [ocupacion, setOcupacion] = useState<OcupacionActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await http.get("/alojamientos-mi/ocupacion-actual");
        if (!alive) return;
        setOcupacion(res.data?.ocupacion || null);
      } catch (err: any) {
        if (!alive) return;
        setOcupacion(null);
        setError(err?.response?.data?.message || "No se pudo obtener la ocupacion actual.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const alojamiento = ocupacion?.alojamiento || {};
  const plaza = ocupacion?.plaza || {};
  const ubicacion = [alojamiento.localidad, alojamiento.provincia].filter(Boolean).join(" / ");
  const tipoClase = [alojamiento.tipo, alojamiento.clase].filter(Boolean).join(" / ");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "clamp(14px, 2vw, 20px)",
        }}
      >
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
          Panel ALOJADO
        </p>
        <h1 style={{ margin: 0, color: "#ffffff", fontSize: "clamp(24px, 3vw, 34px)" }}>
          Mi alojamiento actual
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
          {user?.nombre} {user?.apellido} - <b>{user?.role}</b>
        </p>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "clamp(14px, 2vw, 20px)",
        }}
      >
        {loading ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
            Consultando ocupacion actual...
          </p>
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
        ) : !ocupacion ? (
          <div
            style={{
              border: "1px solid rgba(250,204,21,0.35)",
              background: "rgba(113,63,18,0.22)",
              color: "#fde68a",
              borderRadius: 10,
              padding: 12,
              fontWeight: 800,
            }}
          >
            No se registra una ocupacion activa.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <Field label="Alojamiento" value={alojamiento.codigo} />
              <Field label="Plaza" value={plaza.numero ? `Plaza ${plaza.numero}` : plaza.codigo} />
              <Field label="Dependencia" value={alojamiento.dependencia} />
              <Field label="Lugar" value={alojamiento.lugar} />
              <Field label="Sector" value={alojamiento.sector} />
              <Field label="Tipo / clase" value={tipoClase} />
              <Field label="Localidad / provincia" value={ubicacion} />
              <Field label="Estado asignacion" value={ocupacion.estado} />
              <Field label="Estado plaza" value={plaza.estado} />
              <Field label="Genero permitido" value={plaza.generoPermitido} />
              <Field label="Fecha inicio" value={fmtDate(ocupacion.fechaInicio)} />
              <Field label="Codigo asignacion" value={ocupacion.codigoAsignacion} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
