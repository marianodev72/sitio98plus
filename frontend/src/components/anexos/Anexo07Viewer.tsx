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

  const novedadesArray: string[] = Array.isArray(d.novedadesAdicionales)
    ? d.novedadesAdicionales
    : d.ampliacionNovedades
    ? [String(d.ampliacionNovedades)]
    : d.novedades
    ? [String(d.novedades)]
    : [];

  const styles = {
    wrapper: {
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.1)",
      padding: 18,
      background:
        "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
      boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
      color: "rgba(255,255,255,0.92)",
    } as React.CSSProperties,

    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      color: "rgba(255,255,255,0.6)",
      marginBottom: 10,
      letterSpacing: "0.08em",
    } as React.CSSProperties,

    titleBlock: {
      textAlign: "center" as const,
      marginBottom: 16,
    },

    titleMain: {
      fontWeight: 700,
      fontSize: 18,
      color: "#fff",
      marginBottom: 6,
    },

    titleSub: {
      fontWeight: 700,
      fontSize: 13,
      color: "rgba(255,255,255,0.8)",
      lineHeight: 1.4,
    },

    smallText: {
      fontSize: 11,
      color: "rgba(255,255,255,0.5)",
      marginTop: 4,
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.6)",
      marginBottom: 10,
      textTransform: "uppercase" as const,
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
    },

    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    },

    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.55)",
    },

    value: {
      fontSize: 14,
      fontWeight: 600,
      color: "rgba(255,255,255,0.95)",
      lineHeight: 1.4,
    },

    card: {
      marginTop: 14,
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.05)",
    },

    list: {
      marginTop: 8,
      paddingLeft: 18,
      color: "rgba(255,255,255,0.9)",
    },

    listItem: {
      marginBottom: 6,
      lineHeight: 1.5,
      whiteSpace: "pre-wrap" as const,
    },

    empty: {
      fontSize: 13,
      color: "rgba(255,255,255,0.65)",
    },
  };

  return (
    <div style={styles.wrapper}>
      {/* Encabezado */}
      <div style={styles.headerRow}>
        <span>R.G-6-002</span>
        <span>PÚBLICO</span>
      </div>

      <div style={styles.titleBlock}>
        <div style={styles.titleMain}>ANEXO 07</div>
        <div style={styles.titleSub}>
          PLANILLA AMPLIACIÓN DE NOVEDADES
          <br />
          DEL ACTA DE RECEPCIÓN DE VIVIENDA FISCAL
        </div>
        <div style={styles.smallText}>(3.01., inc. 4.)</div>
      </div>

      <div style={{ marginBottom: 12, fontWeight: 700 }}>
        ARMADA ARGENTINA
      </div>

      {/* Datos principales */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Datos del titular y vivienda</div>

        <div style={styles.grid}>
          <div style={styles.field}>
            <span style={styles.label}>Permisionario</span>
            <span style={styles.value}>{permisionario}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Unidad habitacional</span>
            <span style={styles.value}>{unidadHabitacional}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Dirección</span>
            <span style={styles.value}>{direccion}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Localidad</span>
            <span style={styles.value}>{localidad}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Provincia</span>
            <span style={styles.value}>{provincia}</span>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Inspector</span>
            <span style={styles.value}>{inspector}</span>
          </div>
        </div>
      </div>

      {/* Novedades */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Novedades adicionales</div>

        {novedadesArray.length === 0 ? (
          <div style={styles.empty}>—</div>
        ) : (
          <ol style={styles.list}>
            {novedadesArray.map((n, idx) => (
              <li key={idx} style={styles.listItem}>
                {t(n)}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}