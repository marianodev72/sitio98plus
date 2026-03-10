// frontend/src/components/anexos/Anexo04Vista.tsx
import React from "react";

function safe(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function fmtDateISO(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return safe(v);
  return d.toLocaleDateString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
      <h4 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, padding: "6px 0" }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap" }}>{safe(value)}</div>
    </div>
  );
}

export default function Anexo04Vista({ datos }: { datos: any }) {
  const d = datos || {};
  const periodoDesde = d.periodoDesdeISO || d.periodoDesde || "";
  const periodoHasta = d.periodoHastaISO || d.periodoHasta || "";

  const repE = d.representanteEmergencia || {};
  const repO = d.representanteOrganismo || {};

  return (
    <div>
      <Section title="Datos del trámite">
        <Row label="Permisionario" value={d.permisionarioNombre} />
        <Row label="Grado / Jerarquía" value={d.permisionarioGrado} />
        <Row label="MR / Destino" value={d.permisionarioMR} />
        <Row label="Domicilio" value={d.permisionarioDomicilio} />
        <Row label="Teléfono" value={d.permisionarioTelefono} />
        <Row label="Barrio" value={d.barrioAsignado || d.barrio} />
        <Row label="Unidad habitacional" value={d.unidadHabitacional} />
        <Row label="Dirección unidad" value={d.direccionUnidad} />
      </Section>

      <Section title="Período de ausencia">
        <Row label="Desde" value={fmtDateISO(periodoDesde)} />
        <Row label="Hasta" value={fmtDateISO(periodoHasta)} />
        <Row label="Motivo" value={d.motivo} />
      </Section>

      <Section title="Representante en caso de emergencia">
        <Row label="Apellido y nombres" value={repE.apellidoNombres || repE.nombreCompleto} />
        <Row label="Parentesco" value={repE.parentesco} />
        <Row label="Domicilio" value={repE.domicilio} />
        <Row label="Teléfono" value={repE.telefono} />
        <Row label="Destino" value={repE.destino} />
        <Row label="Teléfono destino" value={repE.telefonoDestino} />
      </Section>

      <Section title="Representante del organismo (si corresponde)">
        <Row label="Apellido y nombres" value={repO.apellidoNombres || repO.nombreCompleto} />
        <Row label="Cargo / Función" value={repO.cargo} />
        <Row label="Destino / Oficina" value={repO.destino || repO.oficina} />
        <Row label="Teléfono" value={repO.telefono} />
      </Section>

      <Section title="Intervención JEFE DE BARRIO">
        <Row label="Observaciones" value={d.observacionesJefeBarrio} />
      </Section>
    </div>
  );
}
