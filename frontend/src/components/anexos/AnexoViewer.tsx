// frontend/src/components/anexos/AnexoViewer.tsx
// Visualización de anexos (01, 02, 03, 07, 08, 09, 11, etc.) en paneles institucionales

import React from "react";

type AnexoViewerProps = {
  codigo?: string;
  datos?: any;

  // Opcionales para hidratar ANEXO_02 (fuente de verdad ANEXO_01 + Vivienda)
  anexo01Datos?: any;
  vivienda?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown, fallback: string = "—") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

function fmtDateTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR");
}

function yn(v: unknown) {
  const s = up(v);
  if (["SI", "SÍ", "YES", "TRUE"].includes(s)) return "SI";
  if (["NO", "FALSE"].includes(s)) return "NO";
  return "—";
}

function mbbrm(v: unknown) {
  const s = up(v);
  if (["MB", "B", "R", "M"].includes(s)) return s;
  return "—";
}

/* ╔══════════════════════════════════════╗
   ║   Helpers ANEXO 11                   ║
   ╚══════════════════════════════════════╝ */

function buildAnexo11Timeline(datos: any) {
  const items: Array<{
    fecha?: string;
    actor: string;
    tipo: string;
    texto: string;
  }> = [];

  const visitas = Array.isArray(datos?.visitasProgramadas)
    ? datos.visitasProgramadas
    : [];

  const obsInspectorHist = Array.isArray(datos?.observacionesInspectorHistorial)
    ? datos.observacionesInspectorHistorial
    : [];

  const obsAdminHist = Array.isArray(datos?.observacionesAdminGeneralHistorial)
    ? datos.observacionesAdminGeneralHistorial
    : [];

  for (const o of obsInspectorHist) {
    items.push({
      fecha: o?.fecha,
      actor: "INSPECTOR",
      tipo: "OBSERVACIÓN",
      texto: o?.texto || "Observación del inspector",
    });
  }

  for (const v of visitas) {
    items.push({
      fecha: v?.creadoAt || v?.fechaRegistro || v?.fechaProgramada,
      actor: "INSPECTOR",
      tipo: "VISITA",
      texto: `Visita programada para ${fmtDateTime(v?.fechaProgramada)} — ${safe(
        v?.observacion
      )}`,
    });
  }

  for (const o of obsAdminHist) {
    items.push({
      fecha: o?.fecha,
      actor: "ADMIN GENERAL",
      tipo: "OBSERVACIÓN",
      texto: o?.texto || "Observación administrativa",
    });
  }

  if (datos?.decisionInspector) {
    items.push({
      fecha:
        datos?.fechaDecisionInspector ||
        datos?.fechaRegistroDecisionInspector ||
        datos?.updatedAt,
      actor: "INSPECTOR",
      tipo: "DECISIÓN",
      texto: `Decisión del inspector: ${safe(datos?.decisionInspector)}`,
    });
  }

  if (datos?.prioridadInspector || datos?.prioridad) {
    items.push({
      fecha:
        datos?.fechaPrioridadInspector ||
        datos?.fechaRegistroPrioridadInspector ||
        datos?.updatedAt,
      actor: "INSPECTOR",
      tipo: "PRIORIDAD",
      texto: `Prioridad fijada: ${safe(
        datos?.prioridadInspector || datos?.prioridad
      )}`,
    });
  }

  if (datos?.responsableTrabajo) {
    items.push({
      fecha:
        datos?.fechaResponsableTrabajo ||
        datos?.fechaRegistroResponsableTrabajo ||
        datos?.updatedAt,
      actor: "INSPECTOR",
      tipo: "RESPONSABLE",
      texto: `Responsable del trabajo: ${safe(datos?.responsableTrabajo)}`,
    });
  }

  if (datos?.fechaProgramadaObra || datos?.descripcionTecnicaObra) {
    items.push({
      fecha: datos?.fechaProgramadaObra || datos?.updatedAt,
      actor: "INSPECTOR",
      tipo: "OBRA",
      texto: `Programación de obra: ${
        datos?.fechaProgramadaObra
          ? fmtDateTime(datos?.fechaProgramadaObra)
          : "—"
      }${
        datos?.descripcionTecnicaObra
          ? ` — ${datos.descripcionTecnicaObra}`
          : ""
      }`,
    });
  }

  if (datos?.trabajoFinalizadoInspector || datos?.fechaFinalizacionInspector) {
    items.push({
      fecha: datos?.fechaFinalizacionInspector || datos?.updatedAt,
      actor: "INSPECTOR",
      tipo: "FINALIZACIÓN",
      texto: `Final de obra: ${
        datos?.observacionFinalInspector || "Trabajo finalizado por inspector"
      }`,
    });
  }

  if (datos?.resolucionAdminGeneral || datos?.fechaCierreAdminGeneral) {
    items.push({
      fecha: datos?.fechaCierreAdminGeneral || datos?.updatedAt,
      actor: "ADMIN GENERAL",
      tipo: "CIERRE",
      texto: `Resolución administrativa: ${safe(
        datos?.resolucionAdminGeneral || "CERRADO"
      )}`,
    });
  }

  items.sort((a, b) => {
    const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
    const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return ta - tb;
  });

  return items;
}

/* ╔══════════════════════════════════════╗
   ║   ANEXO 01 – Postulación básica      ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo01({ datos }: { datos: any }) {
  const motivo = safe(datos?.motivo);

  const styles = {
    section: {
      marginTop: 8,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      margin: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
      marginBottom: 6,
      display: "block",
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 01 – Postulación a vivienda fiscal
      </h4>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Motivo / observación inicial</h5>
        <span style={styles.label}>Detalle registrado</span>
        <div style={styles.textBox}>{motivo}</div>
      </section>
    </div>
  );
}

/* ╔══════════════════════════════════════╗
   ║   ANEXO 02 – Asignación              ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo02({
  datos,
  anexo01Datos,
  vivienda,
}: {
  datos: any;
  anexo01Datos?: any;
  vivienda?: any;
}) {
  const d = datos || {};
  const d01 = anexo01Datos || {};

  const grado = safe(d?.grado || d01?.gradoEscalafon);

  const ape = String(d01?.apellido || "").trim();
  const nom = String(d01?.nombres || "").trim();
  const apeNom = safe(d?.apellidoNombres || `${ape} ${nom}`.trim());

  const matricula = safe(d?.mr || d01?.mr);

  const direccion = safe(d?.direccion, "");
  const departamento = safe(d?.departamento, "");

  const casa = safe(
    vivienda?.codigo || d?.casa || d?.unidadHabitacional || d?.viviendaCodigo,
    ""
  );
  const localidad = safe(vivienda?.barrio || d?.localidad, "");

  const fechaAsignacion = safe(d?.fechaAsignacion);
  const fechaEntrega = safe(d?.fechaEntrega);

  const styles = {
    section: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      margin: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
    } as React.CSSProperties,

    value: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.94)",
      wordBreak: "break-word" as const,
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 02 – Asignación de vivienda fiscal
      </h4>

      <section style={{ ...styles.section, marginTop: 8 }}>
        <h5 style={styles.sectionTitle}>Postulante / Permisionario</h5>

        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Grado</span>
            <span style={styles.value}>{grado}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Apellido y nombres</span>
            <span style={styles.value}>{apeNom}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>M.R. (Matrícula)</span>
            <span style={styles.value}>{matricula}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Unidad habitacional</h5>

        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Dirección</span>
            <span style={styles.value}>{direccion || "—"}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Casa / Unidad</span>
            <span style={styles.value}>{casa}</span>
          </div>

          {departamento && (
            <div style={styles.field}>
              <span style={styles.label}>Departamento</span>
              <span style={styles.value}>{departamento}</span>
            </div>
          )}

          <div style={styles.field}>
            <span style={styles.label}>Localidad</span>
            <span style={styles.value}>{localidad}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Fechas</h5>

        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Fecha de asignación</span>
            <span style={styles.value}>{fechaAsignacion}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Fecha de entrega</span>
            <span style={styles.value}>{fechaEntrega}</span>
          </div>
        </div>
      </section>

      {d?.observaciones && (
        <section style={styles.section}>
          <h5 style={styles.sectionTitle}>Observaciones internas</h5>
          <div style={styles.textBox}>{d.observaciones}</div>
        </section>
      )}
    </div>
  );
}
/* ╔══════════════════════════════════════╗
   ║   ANEXO 03 – Recepción               ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo03({ datos }: { datos: any }) {
  const permNombre =
    datos?.permisionarioNombre ||
    datos?.permisionario ||
    datos?.postulanteNombre ||
    "—";
  const unidad =
    datos?.unidadHabitacional || datos?.casa || datos?.viviendaCodigo || "—";
  const direccion =
    datos?.direccionUnidadHabitacional || datos?.direccion || "—";
  const localidad = datos?.localidad || "—";
  const provincia = datos?.provincia || "—";
  const inspector = datos?.inspectorNombre || datos?.inspector || "—";

  const novedadesTexto = datos?.novedadesTexto || datos?.novedades || "";

  const styles = {
    section: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      margin: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
    } as React.CSSProperties,

    value: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.94)",
      wordBreak: "break-word" as const,
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 03 – Recepción de vivienda fiscal
      </h4>

      <section style={{ ...styles.section, marginTop: 8 }}>
        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Permisionario</span>
            <span style={styles.value}>{safe(permNombre)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Inspector</span>
            <span style={styles.value}>{safe(inspector)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Unidad habitacional</span>
            <span style={styles.value}>{safe(unidad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Dirección</span>
            <span style={styles.value}>{safe(direccion)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Localidad</span>
            <span style={styles.value}>{safe(localidad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Provincia</span>
            <span style={styles.value}>{safe(provincia)}</span>
          </div>
        </div>
      </section>

      {novedadesTexto ? (
        <section style={styles.section}>
          <h5 style={styles.sectionTitle}>Novedades</h5>
          <div style={styles.textBox}>{novedadesTexto}</div>
        </section>
      ) : null}
    </div>
  );
}

/* ╔══════════════════════════════════════╗
   ║   ANEXO 07 – Ampliación de novedades ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo07({ datos }: { datos: any }) {
  const permisionarioNombre =
    datos?.permisionarioNombre ||
    datos?.permisionario ||
    datos?.postulanteNombre ||
    "—";

  const unidadHabitacional =
    datos?.unidadHabitacional || datos?.casa || datos?.viviendaCodigo || "—";

  const direccion =
    datos?.direccionUnidadHabitacional || datos?.direccion || "—";

  const localidad = datos?.localidad || "—";
  const provincia = datos?.provincia || "—";
  const inspectorNombre = datos?.inspectorNombre || datos?.inspector || "—";

  const lugar = datos?.lugar || localidad || "—";
  const fechaTxt = datos?.fechaAmpliacion
    ? fmtDateTime(datos.fechaAmpliacion)
    : datos?.fecha
    ? fmtDateTime(datos.fecha)
    : "—";

  const leyendaConformidad =
    permisionarioNombre !== "—"
      ? `${permisionarioNombre} — Conforme: ${fechaTxt}`
      : `Conforme: ${fechaTxt}`;

  const novedades: string[] = Array.isArray(datos?.novedadesAdicionales)
    ? datos.novedadesAdicionales
    : Array.isArray(datos?.novedades)
    ? datos.novedades
    : typeof datos?.novedades === "string" && datos.novedades.trim()
    ? [datos.novedades]
    : [];

  const styles = {
    section: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      margin: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
    } as React.CSSProperties,

    value: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.94)",
      wordBreak: "break-word" as const,
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,

    list: {
      margin: "8px 0 0 0",
      paddingLeft: 18,
      color: "rgba(255,255,255,0.9)",
    } as React.CSSProperties,

    listItem: {
      marginBottom: 8,
      whiteSpace: "pre-wrap" as const,
      lineHeight: 1.5,
    } as React.CSSProperties,

    empty: {
      color: "rgba(255,255,255,0.68)",
      fontSize: 13,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 07 – Ampliación de novedades de vivienda fiscal
      </h4>

      <section style={{ ...styles.section, marginTop: 8 }}>
        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Permisionario</span>
            <span style={styles.value}>{safe(permisionarioNombre)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Unidad habitacional</span>
            <span style={styles.value}>{safe(unidadHabitacional)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Dirección</span>
            <span style={styles.value}>{safe(direccion)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Localidad</span>
            <span style={styles.value}>{safe(localidad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Provincia</span>
            <span style={styles.value}>{safe(provincia)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Inspector de barrio</span>
            <span style={styles.value}>{safe(inspectorNombre)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Lugar</span>
            <span style={styles.value}>{safe(lugar)}</span>
          </div>

          <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.label}>Fecha y conformidad</span>
            <span style={styles.value}>{leyendaConformidad}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Novedades / ampliaciones</h5>

        {novedades.length === 0 ? (
          <div style={styles.empty}>No hay novedades registradas.</div>
        ) : (
          <ol style={styles.list}>
            {novedades.map((texto, idx) => (
              <li key={idx} style={styles.listItem}>
                {texto}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ╔══════════════════════════════════════╗
   ║   ANEXO 08 – Inspección previa       ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo08({ datos }: { datos: any }) {
  const permisionarioNombre =
    datos?.permisionarioNombre ||
    datos?.permisionario ||
    datos?.postulanteNombre ||
    "—";

  const gradoPermisionario = safe(datos?.gradoPermisionario, "—");

  const unidadHabitacional =
    datos?.unidadHabitacional || datos?.casa || datos?.viviendaCodigo || "—";

  const direccion =
    datos?.direccionUnidad ||
    datos?.direccion ||
    datos?.direccionUnidadHabitacional ||
    "—";

  const localidad = datos?.localidad || "—";
  const provincia = datos?.provincia || "—";
  const inspectorNombre = datos?.inspectorNombre || datos?.inspector || "—";
  const lugar = datos?.lugarInspeccion || datos?.lugarFirma || localidad || "—";
  const fechaInspeccionTxt = datos?.fechaInspeccion
    ? fmtDateTime(datos.fechaInspeccion)
    : datos?.fechaFirma
    ? fmtDateTime(datos.fechaFirma)
    : "—";

  const reparacionesArmada: string[] = Array.isArray(datos?.reparacionesArmada)
    ? datos.reparacionesArmada
    : datos?.reparacionesArmada
    ? [datos.reparacionesArmada]
    : [];

  const reparacionesPermisionario: string[] = Array.isArray(
    datos?.reparacionesPermisionario
  )
    ? datos.reparacionesPermisionario
    : datos?.reparacionesPermisionario
    ? [datos.reparacionesPermisionario]
    : [];

  const obsInspector = datos?.observacionesInspector || "";
  const obsPermisionario = datos?.observacionesPermisionario || "";
  const obsAdmin = datos?.observacionesAdminGeneral || "";

  const rep1 = datos?.representante1 || {};
  const rep2 = datos?.representante2 || {};

  const confPerm = datos?.conformidadPermisionario || null;
  const confAdmin = datos?.conformidadAdminGeneral || null;

  const styles = {
    section: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      margin: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    twoCols: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 14,
    } as React.CSSProperties,

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
    } as React.CSSProperties,

    value: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.94)",
      wordBreak: "break-word" as const,
    } as React.CSSProperties,

    subCard: {
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
    } as React.CSSProperties,

    list: {
      margin: "8px 0 0 0",
      paddingLeft: 18,
      color: "rgba(255,255,255,0.9)",
    } as React.CSSProperties,

    listItem: {
      marginBottom: 6,
      whiteSpace: "pre-wrap" as const,
      lineHeight: 1.5,
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 08 – Acta de inspección previa
      </h4>

      <section style={{ ...styles.section, marginTop: 8 }}>
        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Permisionario</span>
            <span style={styles.value}>{safe(permisionarioNombre)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Grado</span>
            <span style={styles.value}>{gradoPermisionario}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Inspector</span>
            <span style={styles.value}>{safe(inspectorNombre)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Unidad habitacional</span>
            <span style={styles.value}>{safe(unidadHabitacional)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Dirección</span>
            <span style={styles.value}>{safe(direccion)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Localidad</span>
            <span style={styles.value}>{safe(localidad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Provincia</span>
            <span style={styles.value}>{safe(provincia)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Lugar</span>
            <span style={styles.value}>{safe(lugar)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Fecha de inspección</span>
            <span style={styles.value}>{fechaInspeccionTxt}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>
          1. Reparaciones / mantenimientos a cargo de la Alcaldía
        </h5>

        {reparacionesArmada.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 13 }}>
            No se registraron reparaciones.
          </div>
        ) : (
          <ol style={styles.list}>
            {reparacionesArmada.map((texto, idx) => (
              <li key={idx} style={styles.listItem}>
                {texto}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>
          2. Reparaciones / mantenimientos a cargo del Permisionario
        </h5>

        {reparacionesPermisionario.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 13 }}>
            No se registraron reparaciones.
          </div>
        ) : (
          <ol style={styles.list}>
            {reparacionesPermisionario.map((texto, idx) => (
              <li key={idx} style={styles.listItem}>
                {texto}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Representantes del permisionario</h5>

        <div style={styles.twoCols}>
          <div style={styles.subCard}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.58)",
                marginBottom: 10,
              }}
            >
              Representante I
            </div>

            <div style={styles.field}>
              <span style={styles.label}>Apellido y nombres</span>
              <span style={styles.value}>{safe(rep1.apellidoNombres)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Grado</span>
              <span style={styles.value}>{safe(rep1.grado)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>M.R.</span>
              <span style={styles.value}>{safe(rep1.mr)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Destino</span>
              <span style={styles.value}>{safe(rep1.destino)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Teléfono</span>
              <span style={styles.value}>{safe(rep1.telefono)}</span>
            </div>
          </div>

          <div style={styles.subCard}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.58)",
                marginBottom: 10,
              }}
            >
              Representante II
            </div>

            <div style={styles.field}>
              <span style={styles.label}>Apellido y nombres</span>
              <span style={styles.value}>{safe(rep2.apellidoNombres)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Grado</span>
              <span style={styles.value}>{safe(rep2.grado)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>M.R.</span>
              <span style={styles.value}>{safe(rep2.mr)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Destino</span>
              <span style={styles.value}>{safe(rep2.destino)}</span>
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Teléfono</span>
              <span style={styles.value}>{safe(rep2.telefono)}</span>
            </div>
          </div>
        </div>
      </section>

      {obsInspector && (
        <section style={styles.section}>
          <h5 style={styles.sectionTitle}>Observaciones del inspector</h5>
          <div style={styles.textBox}>{obsInspector}</div>
        </section>
      )}

      {obsPermisionario && (
        <section style={styles.section}>
          <h5 style={styles.sectionTitle}>Observaciones del permisionario</h5>
          <div style={styles.textBox}>{obsPermisionario}</div>
        </section>
      )}

      {obsAdmin && (
        <section style={styles.section}>
          <h5 style={styles.sectionTitle}>
            Observaciones / fundamentos ADMIN_GENERAL
          </h5>
          <div style={styles.textBox}>{obsAdmin}</div>
        </section>
      )}

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Constancias</h5>

        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Conformidad del permisionario</span>
            <span style={styles.value}>
              {confPerm?.ok ? `SI — ${fmtDateTime(confPerm?.fecha)}` : "NO"}
            </span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Cierre ADMIN_GENERAL</span>
            <span style={styles.value}>
              {confAdmin?.ok ? `SI — ${fmtDateTime(confAdmin?.fecha)}` : "NO"}
            </span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Lugar / Fecha de firma</span>
            <span style={styles.value}>
              {safe(datos?.lugarFirma || lugar)} —{" "}
              {datos?.fechaFirma ? fmtDateTime(datos.fechaFirma) : "—"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
/* ╔══════════════════════════════════════╗
   ║   ANEXO 09 – Entrega de vivienda     ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo09({ datos }: { datos: any }) {
  const permisionario =
    datos?.permisionarioNombre ||
    datos?.permisionario ||
    datos?.postulanteNombre ||
    "—";

  const unidad =
    datos?.unidadHabitacional || datos?.casa || datos?.viviendaCodigo || "—";
  const direccion =
    datos?.direccionUnidad ||
    datos?.direccion ||
    datos?.direccionUnidadHabitacional ||
    "—";
  const localidad = datos?.localidad || "—";
  const provincia = datos?.provincia || "—";
  const inspector = datos?.inspectorNombre || datos?.inspector || "—";

  const material = datos?.material || {};
  const docu = datos?.documentacion || {};
  const med = datos?.medidores || {};
  const est = datos?.estadoSistemas || {};
  const novedades = datos?.novedadesTexto || datos?.novedades || "";

  const materialRows = [
    ["Llaves puertas de entrada al edificio", yn(material.llavesEdificio)],
    ["Llaves puertas de entrada a la vivienda", yn(material.llavesVivienda)],
    ["Llaves de baulera", yn(material.llavesBaulera)],
    ["Llave acceso a terraza", yn(material.llaveTerraza)],
    ["Llave acceso a cochera", yn(material.llaveCochera)],
    ["Muebles / enseres según inventario", yn(material.inventarioMuebles)],
    ["Línea telefónica funcionando", yn(material.lineaTelefonica)],
  ];

  const docRows = [
    ["Reglamento de Viviendas Fiscales de la Armada", yn(docu.reglamentoViviendas)],
    ["Guía telefónica", yn(docu.guiaTelefonica)],
    ["Reglamento de copropiedad", yn(docu.reglamentoCopropiedad)],
  ];

  const estadoRows = [
    ["Agua", est.agua],
    ["Cloacas", est.cloacas],
    ["Electricidad", est.electricidad],
    ["Gas", est.gas],
    ["Pluviales", est.pluviales],
    ["Teléfono", est.telefono],
    ["Aberturas", est.aberturas],
    ["Albañilería", est.albanileria],
    ["Alfombras", est.alfombras],
    ["Antena TV", est.antenaTv],
    ["Calefactor / Estufa", est.calefactorEstufa],
    ["Calefón / Termotanque", est.calefonTermotanque],
    ["Carpintería", est.carpinteria],
    ["Cerrajería", est.cerrajeria],
    ["Cocina", est.cocina],
    ["Desinfección", est.desinfeccion],
    ["Herrajes", est.herrajes],
    ["Limpieza", est.limpieza],
    ["Lustrado", est.lustrado],
    ["Parques y jardines", est.parquesJardines],
    ["Pintura", est.pintura],
    ["Pisos", est.pisos],
    ["Portero eléctrico", est.porteroElectrico],
    ["Sanitarios", est.sanitarios],
    ["Vidrios", est.vidrios],
    ["Estado general", est.estadoGeneral],
  ];

  const styles = {
    section: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      margin: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
    } as React.CSSProperties,

    value: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.94)",
      wordBreak: "break-word" as const,
    } as React.CSSProperties,

    tableWrap: {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      overflow: "hidden" as const,
      background: "rgba(255,255,255,0.04)",
    } as React.CSSProperties,

    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: 13,
      color: "rgba(255,255,255,0.92)",
    } as React.CSSProperties,

    th: {
      textAlign: "left" as const,
      padding: "10px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.62)",
      fontSize: 11,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      background: "rgba(255,255,255,0.03)",
    } as React.CSSProperties,

    td: {
      padding: "10px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      verticalAlign: "top" as const,
    } as React.CSSProperties,

    valueTd: {
      padding: "10px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      verticalAlign: "top" as const,
      textAlign: "right" as const,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,

    metricGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    metricCard: {
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
    } as React.CSSProperties,

    estadoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 10,
    } as React.CSSProperties,

    estadoItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.9)",
      fontSize: 13,
    } as React.CSSProperties,

    badge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 38,
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.96)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 09 – Acta de entrega de vivienda fiscal
      </h4>

      <section style={{ ...styles.section, marginTop: 8 }}>
        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Permisionario saliente</span>
            <span style={styles.value}>{safe(permisionario)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Inspector</span>
            <span style={styles.value}>{safe(inspector)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Unidad habitacional</span>
            <span style={styles.value}>{safe(unidad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Dirección</span>
            <span style={styles.value}>{safe(direccion)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Localidad</span>
            <span style={styles.value}>{safe(localidad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Provincia</span>
            <span style={styles.value}>{safe(provincia)}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>1. Material</h5>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ítem</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {materialRows.map(([label, value], idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{label}</td>
                  <td style={styles.valueTd}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>2. Documentación</h5>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Documento</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {docRows.map(([label, value], idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{label}</td>
                  <td style={styles.valueTd}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>3. Lecturas de medidores</h5>

        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <div style={styles.label}>Gas</div>
            <div style={styles.value}>{safe(med.gas_m3, "___")} m³</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.label}>Agua</div>
            <div style={styles.value}>{safe(med.agua_m3, "___")} m³</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.label}>Luz</div>
            <div style={styles.value}>{safe(med.luz_kws, "___")} Kws</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.label}>Teléfono</div>
            <div style={styles.value}>{safe(med.telefono_pulsos, "___")} pulsos</div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Estado de sistemas y elementos</h5>

        <div style={styles.estadoGrid}>
          {estadoRows.map(([label, value]) => (
            <div key={label as string} style={styles.estadoItem}>
              <span>{label}</span>
              <span style={styles.badge}>{mbbrm(value)}</span>
            </div>
          ))}
        </div>
      </section>

      {novedades && (
        <section style={styles.section}>
          <h5 style={styles.sectionTitle}>Novedades / observaciones</h5>
          <div style={styles.textBox}>{novedades}</div>
        </section>
      )}
    </div>
  );
}

/* ╔══════════════════════════════════════╗
   ║   ANEXO 11 – Pedido de trabajo       ║
   ╚══════════════════════════════════════╝ */
function ViewAnexo11({ datos }: { datos: any }) {
  const vivienda =
    datos?.viviendaLabel ||
    datos?.unidadHabitacional ||
    datos?.casa ||
    datos?.viviendaCodigo ||
    "—";

  const barrio = datos?.viviendaBarrio || datos?.barrio || "—";

  const permisionario =
    datos?.permisionarioNombre ||
    datos?.postulanteNombre ||
    datos?.permisionario ||
    "—";

  const solicitud =
    datos?.tipoSolicitud ||
    datos?.solicitudDetalle ||
    "—";

  const detalle =
    datos?.detallePedido ||
    datos?.descripcionTrabajo ||
    datos?.detalleTrabajo ||
    datos?.descripcion ||
    "—";

  const prioridad = datos?.prioridadInspector || datos?.prioridad || "—";
  const decision = datos?.decisionInspector || "—";
  const responsable = datos?.responsableTrabajo || "—";
  const trabajoFinalizado = datos?.trabajoFinalizadoInspector ? "SI" : "NO";
  const fechaFinal = datos?.fechaFinalizacionInspector
    ? fmtDateTime(datos.fechaFinalizacionInspector)
    : "—";

  const obsInspector = datos?.observacionesInspector || "—";
  const obsAdmin =
    datos?.observacionesAdminGeneral ||
    datos?.resolucionAdminGeneral ||
    "—";

  const visitas = Array.isArray(datos?.visitasProgramadas)
    ? datos.visitasProgramadas
    : [];

  const timeline = buildAnexo11Timeline(datos);

  const styles = {
    section: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    } as React.CSSProperties,

    sectionTitle: {
      marginTop: 0,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: 700,
      color: "rgba(255,255,255,0.96)",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    } as React.CSSProperties,

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    } as React.CSSProperties,

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.58)",
    } as React.CSSProperties,

    value: {
      fontSize: 15,
      fontWeight: 600,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.94)",
      wordBreak: "break-word" as const,
    } as React.CSSProperties,

    textBox: {
      marginTop: 6,
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      whiteSpace: "pre-wrap" as const,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: 14,
    } as React.CSSProperties,

    tableWrap: {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      overflow: "hidden" as const,
      background: "rgba(255,255,255,0.04)",
    } as React.CSSProperties,

    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: 13,
      color: "rgba(255,255,255,0.9)",
    } as React.CSSProperties,

    th: {
      textAlign: "left" as const,
      padding: "10px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.62)",
      fontSize: 11,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      background: "rgba(255,255,255,0.03)",
    } as React.CSSProperties,

    td: {
      padding: "10px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      verticalAlign: "top" as const,
    } as React.CSSProperties,

    timelineWrap: {
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      borderRadius: 14,
      padding: 12,
      maxHeight: 320,
      overflow: "auto" as const,
    } as React.CSSProperties,

    timelineItem: {
      padding: "10px 0",
      borderBottom: "1px dashed rgba(255,255,255,0.1)",
    } as React.CSSProperties,

    badgeRow: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: 8,
      alignItems: "center",
      marginBottom: 6,
    } as React.CSSProperties,

    badge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.86)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
    } as React.CSSProperties,

    empty: {
      color: "rgba(255,255,255,0.68)",
      fontSize: 13,
    } as React.CSSProperties,
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, marginBottom: 12, color: "#fff" }}>
        ANEXO 11 – Pedido de trabajo
      </h4>

      <section style={{ ...styles.section, marginTop: 8 }}>
        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Vivienda / espacio</span>
            <span style={styles.value}>{safe(vivienda)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Barrio</span>
            <span style={styles.value}>{safe(barrio)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Permisionario</span>
            <span style={styles.value}>{safe(permisionario)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Tipo de solicitud</span>
            <span style={styles.value}>{safe(solicitud)}</span>
          </div>

          <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.label}>Detalle</span>
            <span style={styles.value}>{safe(detalle)}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Intervención del inspector</h5>

        <div style={styles.infoGrid}>
          <div style={styles.field}>
            <span style={styles.label}>Prioridad</span>
            <span style={styles.value}>{safe(prioridad)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Decisión</span>
            <span style={styles.value}>{safe(decision)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Responsable del trabajo</span>
            <span style={styles.value}>{safe(responsable)}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Trabajo finalizado</span>
            <span style={styles.value}>{trabajoFinalizado}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Fecha finalización</span>
            <span style={styles.value}>{fechaFinal}</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Observaciones del inspector</h5>
        <div style={styles.textBox}>{safe(obsInspector)}</div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Observaciones ADMIN GENERAL</h5>
        <div style={styles.textBox}>{safe(obsAdmin)}</div>
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Visitas programadas</h5>

        {visitas.length === 0 ? (
          <div style={styles.empty}>No hay visitas registradas.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha programada</th>
                  <th style={styles.th}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v: any, i: number) => (
                  <tr key={i}>
                    <td style={styles.td}>{fmtDateTime(v.fechaProgramada)}</td>
                    <td style={styles.td}>{safe(v.observacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h5 style={styles.sectionTitle}>Historial / timeline</h5>

        {timeline.length === 0 ? (
          <div style={styles.empty}>No hay movimientos registrados.</div>
        ) : (
          <div style={styles.timelineWrap}>
            {timeline.map((item, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.timelineItem,
                  borderBottom:
                    idx === timeline.length - 1
                      ? "none"
                      : "1px dashed rgba(255,255,255,0.1)",
                }}
              >
                <div style={styles.badgeRow}>
                  <span style={styles.badge}>
                    {item.fecha ? fmtDateTime(item.fecha) : "—"}
                  </span>
                  <span style={styles.badge}>{safe(item.tipo)}</span>
                  <span style={styles.badge}>{safe(item.actor)}</span>
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {safe(item.texto)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
/* ╔══════════════════════════════════════╗
   ║   DEFAULT – Vista genérica           ║
   ╚══════════════════════════════════════╝ */
function ViewGeneric({ datos }: { datos: any }) {
  return (
    <div>
      <h4>Datos del anexo</h4>
      <pre
        style={{
          marginTop: 8,
          padding: 8,
          borderRadius: 6,
          border: "1px solid #eee",
          background: "#f7f7f7",
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(datos || {}, null, 2)}
      </pre>
    </div>
  );
}

export default function AnexoViewer({
  codigo,
  datos,
  anexo01Datos,
  vivienda,
}: AnexoViewerProps) {
  const c = up(codigo);

  if (c === "ANEXO_01") return <ViewAnexo01 datos={datos || {}} />;
  if (c === "ANEXO_02")
    return (
      <ViewAnexo02
        datos={datos || {}}
        anexo01Datos={anexo01Datos}
        vivienda={vivienda}
      />
    );
  if (c === "ANEXO_03") return <ViewAnexo03 datos={datos || {}} />;
  if (c === "ANEXO_07") return <ViewAnexo07 datos={datos || {}} />;
  if (c === "ANEXO_08") return <ViewAnexo08 datos={datos || {}} />;
  if (c === "ANEXO_09") return <ViewAnexo09 datos={datos || {}} />;
  if (c === "ANEXO_11") return <ViewAnexo11 datos={datos || {}} />;

  return <ViewGeneric datos={datos || {}} />;
}