// frontend/src/components/anexos/Anexo07Viewer.tsx

import React from "react";

type Props = {
  datos?: any;
};

function t(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s || "—";
}

export default function Anexo07Viewer({ datos }: Props) {
  const d = datos || {};

  const permisionario =
    t(d.permisionarioNombre || d.permisionario || d.postulanteNombre);
  const unidadHabitacional =
    t(d.unidadHabitacional || d.viviendaCodigo || d.viviendaLabel);
  const direccion = t(
    d.direccionUnidadHabitacional || d.direccion || d.direccionVivienda
  );
  const localidad = t(d.localidad || d.localidadUnidad || d.barrio);
  const provincia = t(d.provincia);
  const inspector = t(d.inspectorNombre);

  // Novedades adicionales: lista de ítems
  const novedadesArray: string[] = Array.isArray(d.novedadesAdicionales)
    ? d.novedadesAdicionales
    : d.ampliacionNovedades
    ? [String(d.ampliacionNovedades)]
    : d.novedades
    ? [String(d.novedades)]
    : [];

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #e0e0e0",
        padding: 16,
        background: "#fff",
      }}
    >
      {/* Encabezado reglamentario */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        <span>
          <b>R.G-6-002</b>
        </span>
        <span>
          <b>PÚBLICO</b>
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>ANEXO 07</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          PLANILLA AMPLIACIÓN DE NOVEDADES
          <br />
          DEL ACTA DE RECEPCIÓN DE VIVIENDA FISCAL DE LA ARMADA
        </div>
        <div style={{ fontSize: 12 }}>(3.01., inc. 4.)</div>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 8 }}>ARMADA ARGENTINA</div>
      <div style={{ marginBottom: 16 }}>
        PLANILLA AMPLIACIÓN DE NOVEDADES DEL ACTA DE RECEPCIÓN DE VIVIENDA
        FISCAL DE LA ARMADA
      </div>

      {/* Cuadro principal de datos del titular / vivienda */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
                width: "25%",
                fontWeight: 700,
              }}
            >
              PERMISIONARIO:
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
              {permisionario}
            </td>
          </tr>
          <tr>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
                fontWeight: 700,
              }}
            >
              UNIDAD HABITACIONAL:
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
              {unidadHabitacional}
            </td>
          </tr>
          <tr>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
                fontWeight: 700,
              }}
            >
              DIRECCIÓN UNIDAD HABITACIONAL:
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
              {direccion}
            </td>
          </tr>
          <tr>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
                fontWeight: 700,
              }}
            >
              LOCALIDAD:
            </td>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
              }}
            >
              {localidad}
            </td>
          </tr>
          <tr>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
                fontWeight: 700,
              }}
            >
              PROVINCIA:
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
              {provincia}
            </td>
          </tr>
          <tr>
            <td
              style={{
                border: "1px solid #000",
                padding: "4px 6px",
                fontWeight: 700,
              }}
            >
              INSPECTOR:
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
              {inspector}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Novedades adicionales */}
      <div style={{ marginTop: 8 }}>
        <span style={{ fontWeight: 700 }}>NOVEDADES ADICIONALES:&nbsp;</span>
        {novedadesArray.length === 0 ? (
          <span>—</span>
        ) : (
          <div style={{ marginTop: 8 }}>
            <ol style={{ paddingLeft: 20 }}>
              {novedadesArray.map((n, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  {t(n)}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
