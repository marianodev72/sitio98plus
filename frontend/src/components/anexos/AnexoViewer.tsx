// frontend/src/components/anexos/AnexoViewer.tsx
// Visualización de anexos (01, 02, 03, 07, 08, 09, etc.) en paneles institucionales

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

  // ✅ En ANEXO_02 el campo "M.R." es Matrícula (en ANEXO_01 viene como "mr")
  const matricula = safe(d?.mr || d01?.mr);

  // Dirección / Departamento hoy no existen en modelo Vivienda; si vienen en datos legacy, se muestran.
  const direccion = safe(d?.direccion, "");
  const departamento = safe(d?.departamento, "");

  // Código institucional de vivienda y barrio (si vivienda está resuelta)
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
  const lugar = datos?.lugar || localidad || "—";
  const fechaInspeccionTxt = datos?.fechaInspeccion
    ? fmtDateTime(datos.fechaInspeccion)
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
        <b>1. Reparaciones / mantenimientos a cargo de la Armada</b>
        {reparacionesArmada.length === 0 ? (
          <p style={{ marginTop: 6 }}>No se registraron reparaciones.</p>
        ) : (
          <ol style={{ marginTop: 6, paddingLeft: 20 }}>
            {reparacionesArmada.map((texto, idx) => (
              <li
                key={idx}
                style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}
              >
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
        <b>2. Reparaciones / mantenimientos a cargo del permisionario</b>
        {reparacionesPermisionario.length === 0 ? (
          <p style={{ marginTop: 6 }}>No se registraron reparaciones.</p>
        ) : (
          <ol style={{ marginTop: 6, paddingLeft: 20 }}>
            {reparacionesPermisionario.map((texto, idx) => (
              <li
                key={idx}
                style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}
              >
                {texto}
              </li>
            ))}
          </ol>
        )}
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

  return <ViewGeneric datos={datos || {}} />;
}
