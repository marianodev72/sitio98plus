//frontend\src\components\anexos\Anexo09Vista.tsx
import React from "react";

function safe(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function fmtDate(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return safe(v);
  return d.toLocaleDateString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <h4 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap" }}>{safe(value)}</div>
    </div>
  );
}

export default function Anexo09Vista({
  datos,
  estado,
  estadoInstitucional,
  fechaInicio,
}: {
  datos: any;
  estado?: string;
  estadoInstitucional?: string | null;
  fechaInicio?: string;
}) {
  const d = datos || {};

  return (
    <div>
      <Section title="Datos del acta">
        <Row label="Estado" value={`${safe(estado)}${estadoInstitucional ? ` / ${estadoInstitucional}` : ""}`} />
        <Row label="Fecha de inicio" value={fechaInicio} />
        <Row label="Inspector" value={d.inspectorNombre} />
        <Row label="Permisionario" value={d.permisionarioNombre || d.postulanteNombre} />
        <Row label="Anexo origen" value={d.derivadoDe} />
      </Section>

      <Section title="Identificación de la vivienda">
        <Row label="Unidad habitacional" value={d.viviendaLabel || d.viviendaCodigo || d.unidadHabitacional || d.casa} />
        <Row label="Dirección" value={d.direccion || d.direccionUnidad} />
        <Row label="Localidad" value={d.localidad} />
        <Row label="Provincia" value={d.provincia} />
        <Row label="Barrio" value={d.barrio} />
      </Section>

      <Section title="Acto de entrega">
        <Row label="Lugar de entrega" value={d.lugarEntrega || d.lugarFirma} />
        <Row label="Fecha de entrega" value={fmtDate(d.fechaEntrega || d.fechaFirma)} />
        <Row label="Hora de entrega" value={d.horaEntrega} />
      </Section>

      <Section title="Estado de la vivienda / Observaciones">
        <Row label="Observaciones" value={d.observacionesEntrega || d.observacionesInspector || d.novedadesTexto} />
        <Row label="Inventario / Detalle" value={d.detalleInventario} />
        <Row label="Servicios" value={d.servicios} />
        <Row label="Llaves entregadas" value={d.llavesEntregadas} />
      </Section>

      <Section title="Conformidad del permisionario">
        <Row
          label="Estado"
          value={d?.conformidadPermisionario?.ok ? "Registrada" : "Pendiente"}
        />
        <Row
          label="Fecha"
          value={fmtDate(d?.conformidadPermisionario?.fecha)}
        />
        <Row
          label="Observaciones"
          value={d?.conformidadPermisionario?.observaciones}
        />
      </Section>
    </div>
  );
}