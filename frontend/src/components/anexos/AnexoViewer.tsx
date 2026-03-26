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
  return (
    <div>
      <h4>ANEXO 01 – Postulación a vivienda fiscal</h4>
      <div style={{ marginTop: 8 }}>
        <b>Motivo / observación inicial:</b>
        <div
          style={{
            marginTop: 4,
            padding: 8,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fafafa",
            whiteSpace: "pre-wrap",
          }}
        >
          {motivo}
        </div>
      </div>
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

  return (
    <div>
      <h4>ANEXO 02 – Asignación de vivienda fiscal</h4>

      <div style={{ marginTop: 8 }}>
        <b>Postulante / Permisionario:</b>
        <div style={{ marginTop: 4 }}>
          <div>
            <b>Grado:</b> {grado}
          </div>
          <div>
            <b>Apellido y nombres:</b> {apeNom}
          </div>
          <div>
            <b>M.R. (Matrícula):</b> {matricula}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Unidad habitacional:</b>
        <div style={{ marginTop: 4 }}>
          <div>
            <b>Dirección:</b> {direccion || "—"}
          </div>
          <div>
            <b>Casa / Unidad:</b> {casa}
          </div>
          {departamento && (
            <div>
              <b>Departamento:</b> {departamento}
            </div>
          )}
          <div>
            <b>Localidad:</b> {localidad}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Fechas:</b>
        <div style={{ marginTop: 4 }}>
          <div>
            <b>Fecha de asignación:</b> {fechaAsignacion}
          </div>
          <div>
            <b>Fecha de entrega:</b> {fechaEntrega}
          </div>
        </div>
      </div>

      {d?.observaciones && (
        <div style={{ marginTop: 12 }}>
          <b>Observaciones internas:</b>
          <div
            style={{
              marginTop: 4,
              padding: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fafafa",
              whiteSpace: "pre-wrap",
            }}
          >
            {d.observaciones}
          </div>
        </div>
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

  return (
    <div>
      <h4>ANEXO 03 – Recepción de vivienda fiscal</h4>

      <div style={{ marginTop: 8 }}>
        <b>Permisionario:</b> {safe(permNombre)}
      </div>
      <div style={{ marginTop: 4 }}>
        <b>Inspector:</b> {safe(inspector)}
      </div>

      <div style={{ marginTop: 8 }}>
        <b>Vivienda / Unidad:</b>
        <div style={{ marginTop: 4 }}>
          <div>
            <b>Unidad habitacional:</b> {safe(unidad)}
          </div>
          <div>
            <b>Dirección:</b> {safe(direccion)}
          </div>
          <div>
            <b>Localidad:</b> {safe(localidad)}
          </div>
          <div>
            <b>Provincia:</b> {safe(provincia)}
          </div>
        </div>
      </div>

      {novedadesTexto ? (
        <div style={{ marginTop: 12 }}>
          <b>Novedades:</b>
          <div
            style={{
              marginTop: 4,
              padding: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fafafa",
              whiteSpace: "pre-wrap",
            }}
          >
            {novedadesTexto}
          </div>
        </div>
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

  return (
    <div>
      <h4>ANEXO 07 – Ampliación de novedades de vivienda fiscal</h4>

      <section
        style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <div>
          <b>Permisionario:</b> {safe(permisionarioNombre)}
        </div>
        <div>
          <b>Unidad habitacional:</b> {safe(unidadHabitacional)}
        </div>
        <div>
          <b>Dirección:</b> {safe(direccion)}
        </div>
        <div>
          <b>Localidad:</b> {safe(localidad)}
        </div>
        <div>
          <b>Provincia:</b> {safe(provincia)}
        </div>
        <div>
          <b>Inspector de barrio:</b> {safe(inspectorNombre)}
        </div>
        <div style={{ marginTop: 6 }}>
          <b>Lugar:</b> {safe(lugar)}
        </div>
        <div>
          <b>Fecha y conformidad:</b> {leyendaConformidad}
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>Novedades / ampliaciones</b>

        {novedades.length === 0 ? (
          <p style={{ marginTop: 6 }}>No hay novedades registradas.</p>
        ) : (
          <ol style={{ marginTop: 6, paddingLeft: 20 }}>
            {novedades.map((texto, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: 4,
                  whiteSpace: "pre-wrap",
                }}
              >
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

  return (
    <div>
      <h4>ANEXO 08 – Acta de inspección previa</h4>

      <section
        style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <div>
          <b>Permisionario:</b> {safe(permisionarioNombre)}
        </div>
        <div>
          <b>Grado:</b> {gradoPermisionario}
        </div>
        <div>
          <b>Inspector:</b> {safe(inspectorNombre)}
        </div>
        <div style={{ marginTop: 6 }}>
          <b>Unidad habitacional:</b> {safe(unidadHabitacional)}
        </div>
        <div>
          <b>Dirección:</b> {safe(direccion)}
        </div>
        <div>
          <b>Localidad:</b> {safe(localidad)}
        </div>
        <div>
          <b>Provincia:</b> {safe(provincia)}
        </div>
        <div style={{ marginTop: 6 }}>
          <b>Lugar:</b> {safe(lugar)}
        </div>
        <div>
          <b>Fecha de inspección:</b> {fechaInspeccionTxt}
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>1. Reparaciones / mantenimientos a cargo de la Alcaldía</b>
        {reparacionesArmada.length === 0 ? (
          <p style={{ marginTop: 6 }}>No se registraron reparaciones.</p>
        ) : (
          <ol style={{ marginTop: 6, paddingLeft: 20 }}>
            {reparacionesArmada.map((texto, idx) => (
              <li key={idx} style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>
                {texto}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>2. Reparaciones / mantenimientos a cargo del Permisionario</b>
        {reparacionesPermisionario.length === 0 ? (
          <p style={{ marginTop: 6 }}>No se registraron reparaciones.</p>
        ) : (
          <ol style={{ marginTop: 6, paddingLeft: 20 }}>
            {reparacionesPermisionario.map((texto, idx) => (
              <li key={idx} style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>
                {texto}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <b>Representantes del permisionario</b>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700 }}>Representante I</div>
          <div>Apellido y nombres: {safe(rep1.apellidoNombres)}</div>
          <div>Grado: {safe(rep1.grado)}</div>
          <div>M.R.: {safe(rep1.mr)}</div>
          <div>Destino: {safe(rep1.destino)}</div>
          <div>Teléfono: {safe(rep1.telefono)}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Representante II</div>
          <div>Apellido y nombres: {safe(rep2.apellidoNombres)}</div>
          <div>Grado: {safe(rep2.grado)}</div>
          <div>M.R.: {safe(rep2.mr)}</div>
          <div>Destino: {safe(rep2.destino)}</div>
          <div>Teléfono: {safe(rep2.telefono)}</div>
        </div>
      </section>

      {obsInspector && (
        <section
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fafafa",
          }}
        >
          <b>Observaciones del inspector</b>
          <div
            style={{
              marginTop: 6,
              padding: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
              whiteSpace: "pre-wrap",
            }}
          >
            {obsInspector}
          </div>
        </section>
      )}

      {obsPermisionario && (
        <section
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fafafa",
          }}
        >
          <b>Observaciones del permisionario</b>
          <div
            style={{
              marginTop: 6,
              padding: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
              whiteSpace: "pre-wrap",
            }}
          >
            {obsPermisionario}
          </div>
        </section>
      )}

      {obsAdmin && (
        <section
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fafafa",
          }}
        >
          <b>Observaciones / fundamentos ADMIN_GENERAL</b>
          <div
            style={{
              marginTop: 6,
              padding: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
              whiteSpace: "pre-wrap",
            }}
          >
            {obsAdmin}
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <b>Constancias</b>
        <div style={{ marginTop: 8 }}>
          <div>
            <b>Conformidad del permisionario:</b>{" "}
            {confPerm?.ok ? `SI — ${fmtDateTime(confPerm?.fecha)}` : "NO"}
          </div>
          <div>
            <b>Cierre ADMIN_GENERAL:</b>{" "}
            {confAdmin?.ok ? `SI — ${fmtDateTime(confAdmin?.fecha)}` : "NO"}
          </div>
          <div>
            <b>Lugar / Fecha de firma:</b> {safe(datos?.lugarFirma || lugar)} —{" "}
            {datos?.fechaFirma ? fmtDateTime(datos.fechaFirma) : "—"}
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

  return (
    <div>
      <h4>ANEXO 09 – Acta de entrega de vivienda fiscal</h4>

      <section
        style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <div>
          <b>Permisionario saliente:</b> {safe(permisionario)}
        </div>
        <div>
          <b>Inspector:</b> {safe(inspector)}
        </div>
        <div style={{ marginTop: 6 }}>
          <b>Unidad habitacional:</b> {safe(unidad)}
        </div>
        <div>
          <b>Dirección:</b> {safe(direccion)}
        </div>
        <div>
          <b>Localidad:</b> {safe(localidad)}
        </div>
        <div>
          <b>Provincia:</b> {safe(provincia)}
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>1. Material</b>
        <table
          style={{
            width: "100%",
            marginTop: 6,
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <tbody>
            <tr>
              <td>Llaves puertas de entrada al edificio</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.llavesEdificio)}
              </td>
            </tr>
            <tr>
              <td>Llaves puertas de entrada a la vivienda</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.llavesVivienda)}
              </td>
            </tr>
            <tr>
              <td>Llaves de baulera</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.llavesBaulera)}
              </td>
            </tr>
            <tr>
              <td>Llave acceso a terraza</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.llaveTerraza)}
              </td>
            </tr>
            <tr>
              <td>Llave acceso a cochera</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.llaveCochera)}
              </td>
            </tr>
            <tr>
              <td>Muebles / enseres según inventario</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.inventarioMuebles)}
              </td>
            </tr>
            <tr>
              <td>Línea telefónica funcionando</td>
              <td style={{ textAlign: "right" }}>
                {yn(material.lineaTelefonica)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>2. Documentación</b>
        <table
          style={{
            width: "100%",
            marginTop: 6,
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <tbody>
            <tr>
              <td>Reglamento de Viviendas Fiscales de la Armada</td>
              <td style={{ textAlign: "right" }}>
                {yn(docu.reglamentoViviendas)}
              </td>
            </tr>
            <tr>
              <td>Guía telefónica</td>
              <td style={{ textAlign: "right" }}>{yn(docu.guiaTelefonica)}</td>
            </tr>
            <tr>
              <td>Reglamento de copropiedad</td>
              <td style={{ textAlign: "right" }}>
                {yn(docu.reglamentoCopropiedad)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>3. Lecturas de medidores</b>
        <div style={{ marginTop: 6, fontSize: 12 }}>
          <div>GAS: {safe(med.gas_m3, "___")} m³</div>
          <div>AGUA: {safe(med.agua_m3, "___")} m³</div>
          <div>LUZ: {safe(med.luz_kws, "___")} Kws</div>
          <div>TELÉFONO: {safe(med.telefono_pulsos, "___")} pulsos</div>
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "white",
        }}
      >
        <b>Estado de sistemas y elementos</b>
        <div
          style={{
            marginTop: 6,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            fontSize: 12,
          }}
        >
          {[
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
          ].map(([label, value]) => (
            <div key={label as string}>
              <span>{label}:</span> <b>{mbbrm(value)}</b>
            </div>
          ))}
        </div>
      </section>

      {novedades && (
        <section
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fafafa",
          }}
        >
          <b>Novedades / observaciones</b>
          <div
            style={{
              marginTop: 6,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              whiteSpace: "pre-wrap",
            }}
          >
            {novedades}
          </div>
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

  return (
    <div>
      <h4>ANEXO 11 – Pedido de trabajo</h4>

      <section
        style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <div><b>Vivienda / Espacio:</b> {safe(vivienda)}</div>
        <div><b>Barrio:</b> {safe(barrio)}</div>
        <div><b>Permisionario:</b> {safe(permisionario)}</div>
        <div><b>Tipo de solicitud:</b> {safe(solicitud)}</div>
        <div><b>Detalle:</b> {safe(detalle)}</div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h5 style={{ marginTop: 0 }}>Intervención del inspector</h5>
        <div><b>Prioridad:</b> {safe(prioridad)}</div>
        <div><b>Decisión:</b> {safe(decision)}</div>
        <div><b>Responsable del trabajo:</b> {safe(responsable)}</div>
        <div><b>Trabajo finalizado:</b> {trabajoFinalizado}</div>
        <div><b>Fecha finalización:</b> {fechaFinal}</div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h5 style={{ marginTop: 0 }}>Observaciones del inspector</h5>
        <div
          style={{
            marginTop: 4,
            padding: 8,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            whiteSpace: "pre-wrap",
          }}
        >
          {safe(obsInspector)}
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h5 style={{ marginTop: 0 }}>Observaciones ADMIN GENERAL</h5>
        <div
          style={{
            marginTop: 4,
            padding: 8,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            whiteSpace: "pre-wrap",
          }}
        >
          {safe(obsAdmin)}
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h5 style={{ marginTop: 0 }}>Visitas programadas</h5>

        {visitas.length === 0 ? (
          <p>No hay visitas registradas.</p>
        ) : (
          <table
            style={{
              width: "100%",
              marginTop: 6,
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: 4,
                  }}
                >
                  Fecha programada
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: 4,
                  }}
                >
                  Observación
                </th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v: any, i: number) => (
                <tr key={i}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>
                    {fmtDateTime(v.fechaProgramada)}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>
                    {safe(v.observacion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h5 style={{ marginTop: 0 }}>Historial cronológico del trámite</h5>

        {timeline.length === 0 ? (
          <p>No hay intervenciones registradas.</p>
        ) : (
          <div
            style={{
              marginTop: 6,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
              padding: 8,
            }}
          >
            {timeline.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 0",
                  borderBottom:
                    i < timeline.length - 1 ? "1px dashed #ddd" : "none",
                }}
              >
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  <b>{fmtDateTime(item.fecha)}</b> — {item.actor} — {item.tipo}
                </div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
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