import React, { useEffect, useMemo, useState } from "react";
import http from "../../api/http";

/* ================= UTILIDADES ================= */

// Colores fallback (cuando el label no tiene semántica fija)
const FALLBACK_COLORS = [
  "#4CAF50",
  "#FFC107",
  "#F44336",
  "#2196F3",
  "#9C27B0",
  "#FF9800",
  "#00BCD4",
  "#795548",
];

// ✅ Colores fijos por significado institucional (semánticos)
const COLOR_MAP: Record<string, string> = {
  // Hacinamiento
  ROJO: "#E53935",
  AMARILLO: "#FBC02D",
  VERDE: "#43A047",

  // Estado vivienda
  OCUPADA: "#43A047",
  DISPONIBLE: "#1E88E5",
  RESERVADA: "#8E24AA",
  REPARACION: "#FB8C00",
  REPARACIÓN: "#FB8C00",

  // Flujo / ANEXO_11
  APROBADO: "#43A047",
  DESAPROBADO: "#E53935",
  ABIERTO: "#FB8C00",
  FINALIZADO: "#1E88E5",
  DERIVADO: "#43A047",
  NO_DERIVADO: "#FBC02D",

  // Buckets y normalizaciones
  OTROS: "#9E9E9E",
  SIN_DATO: "#BDBDBD",
  SIN_BARRIO: "#BDBDBD",
  SIN_ESTADO: "#BDBDBD",
};

function normalizeKey(v: unknown) {
  return String(v ?? "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_");
}

function pickColor(label: string, i: number) {
  const k = normalizeKey(label);
  return COLOR_MAP[k] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const ORG_HEADER = "BASE NAVAL USHUAIA - DEPARTAMENTO ALCALDIA";
const ORG_SUBHEADER =
  "Estadísticas Institucionales – ORGANO ADMINISTRADOR VVFFZN98";

const FORMULARIO_CODIGOS = [
  "ANEXO_01",
  "ANEXO_02",
  "ANEXO_03",
  "ANEXO_04",
  "ANEXO_07",
  "ANEXO_08",
  "ANEXO_09",
  "ANEXO_10",
  "ANEXO_11",
  "ANEXO_21",
  "ANEXO_22",
  "ANEXO_23",
  "ANEXO_24",
  "ANEXO_25",
  "ANEXO_26",
  "ANEXO_28",
];

const FORMULARIO_ESTADOS = [
  "BORRADOR",
  "ENVIADO",
  "EN_REVISION",
  "APROBADO",
  "RECHAZADO",
  "CERRADO",
  "ASIGNADO",
];

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function safeFile(s: string) {
  return String(s || "grafico")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

function escapeXml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fmtDateTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR");
}

/* ================= UI BLOQUES (INSTITUCIONAL) ================= */

function Card({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  padding: 18,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
  color: "#eaf0ff",
}}
    >
      <div style={{ fontSize: 17, fontWeight: 900, color: "#ffffff" }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, color: "rgba(255,255,255,0.82)" }}>
          {subtitle}
        </div>
      ) : null}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  accent = "#111",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  padding: 18,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
  position: "relative",
  overflow: "hidden",
  width: "100%",
  maxWidth: 320,
  color: "#ffffff",
}}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: accent,
          opacity: 0.95,
        }}
      />
      <div style={{ paddingLeft: 10, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 900, opacity: 0.92 }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: -0.4,
          }}
        >
          {value}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.82 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 22,
        fontSize: 15,
fontWeight: 900,
letterSpacing: 0.8,
opacity: 0.82,
color: "rgba(255,255,255,0.86)",
      }}
    >
      {children}
    </div>
  );
}

/* ================= PIE CHART SVG ================= */

function PieChart({
  title,
  subtitle,
  data,
  scopeLabel,
}: {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  scopeLabel?: string;
}) {
  const total = (data || []).reduce((a, b) => a + (Number(b.value) || 0), 0);

  const sorted = useMemo(() => {
    return [...(data || [])].sort(
      (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)
    );
  }, [data]);

  const safeData =
    total > 0 ? sorted.filter((d) => Number(d.value || 0) > 0) : [];
  let acc = 0;

  const paths =
    safeData.length === 1
      ? [
          <circle
            key="single-slice"
            cx="50"
            cy="50"
            r="40"
            fill={pickColor(safeData[0].label, 0)}
          />,
        ]
      : safeData.map((d, i) => {
          const start = (acc / total) * 2 * Math.PI;
          acc += Number(d.value || 0);
          const end = (acc / total) * 2 * Math.PI;

          const x1 = 50 + 40 * Math.cos(start);
          const y1 = 50 + 40 * Math.sin(start);
          const x2 = 50 + 40 * Math.cos(end);
          const y2 = 50 + 40 * Math.sin(end);

          const large = end - start > Math.PI ? 1 : 0;
          const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`;

          const fill = pickColor(d.label, i);
          return <path key={i} d={path} fill={fill} />;
        });

  const onDownloadSVG = () => {
    const stamp = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fecha = `${pad(stamp.getDate())}/${pad(
      stamp.getMonth() + 1
    )}/${stamp.getFullYear()} ${pad(stamp.getHours())}:${pad(
      stamp.getMinutes()
    )}`;

    const W = 1100;
    const H = 720;

    const cx = 330;
    const cy = 400;
    const r = 180;

    const slices = total > 0 ? safeData : [];
    let acc2 = 0;

    const slicePaths =
      slices.length === 1
        ? [
            `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pickColor(
              slices[0].label,
              0
            )}" />`,
          ]
        : slices.map((d, i) => {
            const v = Number(d.value || 0);
            const start = (acc2 / total) * 2 * Math.PI;
            acc2 += v;
            const end = (acc2 / total) * 2 * Math.PI;

            const x1 = cx + r * Math.cos(start);
            const y1 = cy + r * Math.sin(start);
            const x2 = cx + r * Math.cos(end);
            const y2 = cy + r * Math.sin(end);

            const large = end - start > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

            const fill = pickColor(d.label, i);
            return `<path d="${path}" fill="${fill}" />`;
          });

    const legendX = 640;
    const legendY = 290;
    const lineH = 26;

    const legendItems = (slices.length ? slices : sorted)
      .slice(0, 24)
      .map((d, i) => {
        const fill = pickColor(d.label, i);
        const v = Number(d.value || 0);
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        const y = legendY + i * lineH;

        return `
        <rect x="${legendX}" y="${y - 12}" width="14" height="14" fill="${fill}" />
        <text x="${legendX + 22}" y="${y}" font-size="14" fill="#111">
          ${escapeXml(String(d.label ?? "SIN_DATO"))}: ${v}${
          total > 0 ? ` (${pct}%)` : ""
        }
        </text>
      `;
      });

    const header = `
      <text x="60" y="70" font-size="24" font-weight="700" fill="#111">${escapeXml(
        ORG_HEADER
      )}</text>
      <text x="60" y="105" font-size="16" font-weight="600" fill="#111">${escapeXml(
        ORG_SUBHEADER
      )}</text>

      <text x="60" y="150" font-size="20" font-weight="700" fill="#111">${escapeXml(
        title
      )}</text>
      ${
        subtitle
          ? `<text x="60" y="178" font-size="13" fill="#333">${escapeXml(
              subtitle
            )}</text>`
          : ""
      }

      <text x="60" y="205" font-size="13" fill="#333">${escapeXml(
        scopeLabel || "Ámbito: Todos"
      )} • Emitido: ${fecha}</text>
      <line x1="60" y1="225" x2="${
        W - 60
      }" y2="225" stroke="#ddd" stroke-width="2" />
    `;

    const footer = `
      <line x1="60" y1="${H - 90}" x2="${
      W - 60
    }" y2="${H - 90}" stroke="#eee" stroke-width="2" />
      <text x="60" y="${H - 58}" font-size="12" fill="#666">
        Documento de uso interno. Salida agregada y opaca. No contiene datos nominales ni registros individuales.
      </text>
      <text x="60" y="${H - 38}" font-size="12" fill="#666">
        Acceso exclusivo ADMIN_GENERAL.
      </text>
    `;

    const empty =
      total <= 0
        ? `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="16" fill="#555">Sin datos</text>`
        : "";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>
  ${header}

  ${slicePaths.join("\n")}
  ${empty}

  <text x="${cx}" y="${
      cy + r + 40
    }" text-anchor="middle" font-size="14" fill="#111">
    Total: ${total}
  </text>

  <text x="${legendX}" y="${
      legendY - 40
    }" font-size="16" font-weight="700" fill="#111">Referencias</text>
  ${legendItems.join("\n")}

  ${footer}
</svg>`;

    download(
      `${safeFile(title)}_${safeFile(scopeLabel || "TODOS")}.svg`,
      svg,
      "image/svg+xml;charset=utf-8"
    );
  };

  const onDownloadCSV = () => {
    const stamp = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fecha = `${pad(stamp.getDate())}/${pad(
      stamp.getMonth() + 1
    )}/${stamp.getFullYear()} ${pad(stamp.getHours())}:${pad(
      stamp.getMinutes()
    )}`;

    const rows = (sorted || []).map((d) => {
      const v = Number(d.value || 0);
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return { label: String(d.label ?? "SIN_DATO"), value: v, pct };
    });

    const header =
      `${ORG_HEADER}\n` +
      `${ORG_SUBHEADER}\n` +
      `${title}\n` +
      (subtitle ? `${subtitle}\n` : "") +
      `${scopeLabel || "Ámbito: Todos"}\n` +
      `Emitido: ${fecha}\n\n`;

    const csv =
      header +
      `Etiqueta,Cantidad,Porcentaje\n` +
      rows
        .map(
          (r) => `"${r.label.replaceAll('"', '""')}",${r.value},${r.pct}%`
        )
        .join("\n") +
      `\n`;

    download(
      `${safeFile(title)}_${safeFile(scopeLabel || "TODOS")}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  };

  return (
    <div>
      <svg
        width="220"
        height="220"
        viewBox="0 0 100 100"
        aria-label={title}
        style={{ marginTop: 8 }}
      >
        {paths}
        {total <= 0 ? (
          <text x="50" y="52" textAnchor="middle" fontSize="8">
            Sin datos
          </text>
        ) : null}
      </svg>

      <ul style={{ marginTop: 12, paddingLeft: 18, color: "#eaf0ff", fontSize: 15, lineHeight: 1.6 }}>
        {(sorted || []).map((d, i) => {
          const v = Number(d.value || 0);
          const pct = total > 0 ? Math.round((v / total) * 100) : 0;
          const fill = pickColor(d.label, i);
          return (
            <li key={i}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  background: fill,
                  marginRight: 6,
                }}
              />
              {d.label}: {v}
              {total > 0 ? ` (${pct}%)` : ""}
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: 8 }}>
        <button
  onClick={onDownloadSVG}
  style={{
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  }}
>
  Descargar gráfico
</button>{" "}
<button
  onClick={onDownloadCSV}
  style={{
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  }}
>
  Descargar datos
</button>
      </div>
    </div>
  );
}

function BarChart({
  data,
  maxRows = 12,
  preserveOrder = false,
}: {
  data: { label: string; value: number }[];
  maxRows?: number;
  preserveOrder?: boolean;
}) {
  const baseRows = [...(data || [])].filter((d) => Number(d.value || 0) > 0);
  const rows = (preserveOrder
    ? baseRows
    : baseRows.sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
  ).slice(0, maxRows);
  const max = rows.reduce((acc, row) => Math.max(acc, Number(row.value || 0)), 0);

  if (!rows.length) {
    return <div style={{ color: "rgba(255,255,255,0.72)" }}>Sin datos.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((row, i) => {
        const pct = max > 0 ? Math.max(4, Math.round((Number(row.value || 0) / max) * 100)) : 0;
        return (
          <div key={`${row.label}-${i}`} style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                color: "rgba(255,255,255,0.86)",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label}
              </span>
              <span>{row.value}</span>
            </div>
            <div
              style={{
                marginTop: 6,
                height: 10,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: pickColor(row.label, i),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= PAGE ================= */

export default function AdminStats() {
  const [barrios, setBarrios] = useState<string[]>([]);
  const [barrio, setBarrio] = useState<string>("TODOS");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [data, setData] = useState<any>(null);
  const [emittedLabel, setEmittedLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [docStats, setDocStats] = useState<any>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docErrorMsg, setDocErrorMsg] = useState("");
  const [docCodigoFiltro, setDocCodigoFiltro] = useState("TODOS");
  const [docEstadoFiltro, setDocEstadoFiltro] = useState("TODOS");

  useEffect(() => {
    let alive = true;

    http
      .get("/stats/barrios")
      .then((r) => {
        if (alive) setBarrios(r.data || []);
      })
      .catch((err) => {
        console.error("[STATS] Error cargando barrios", err);
        if (alive) setErrorMsg("No se pudieron cargar los barrios disponibles.");
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const url =
      barrio === "TODOS"
        ? "/stats/resumen"
        : `/stats/barrio/${encodeURIComponent(barrio)}`;

    setLoading(true);
    setErrorMsg("");
    setData(null);

    http
      .get(url, { params: { year } })
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch((err) => {
        console.error("[STATS] Error cargando resumen", err);
        if (alive) {
          setData(null);
          setErrorMsg("No se pudieron cargar las estadísticas. Reintentá más tarde.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [barrio, year]);

  useEffect(() => {
    const stamp = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const txt = `Emitido: ${pad(stamp.getDate())}/${pad(
      stamp.getMonth() + 1
    )}/${stamp.getFullYear()} ${pad(stamp.getHours())}:${pad(
      stamp.getMinutes()
    )} • Año estadístico: ${year}`;
    setEmittedLabel(txt);
  }, [barrio, year]);

  useEffect(() => {
    let alive = true;
    const params: Record<string, string | number> = { year };

    if (barrio !== "TODOS") params.barrio = barrio;
    if (docCodigoFiltro !== "TODOS") params.codigo = docCodigoFiltro;
    if (docEstadoFiltro !== "TODOS") params.estado = docEstadoFiltro;

    setDocLoading(true);
    setDocErrorMsg("");
    setDocStats(null);

    http
      .get("/stats/formularios", { params })
      .then((r) => {
        if (alive) setDocStats(r.data);
      })
      .catch((err) => {
        console.error("[STATS] Error cargando gestión documental", err);
        if (alive) {
          setDocStats(null);
          setDocErrorMsg("No se pudieron cargar las métricas de gestión documental.");
        }
      })
      .finally(() => {
        if (alive) setDocLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [barrio, year, docCodigoFiltro, docEstadoFiltro]);

  const availableYears = useMemo(() => {
    const startYear = 2024;
    const years: number[] = [];
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const barriosSeleccionables = useMemo(
    () => barrios.filter((b) => normalizeKey(b) !== "OTROS"),
    [barrios]
  );

  const hayBarriosAgrupados = barrios.some((b) => normalizeKey(b) === "OTROS");

  const charts = useMemo(() => {
    if (!data) return null;

    return [
      {
        title: "Distribución de Habitantes por Vivienda",
        subtitle: "Cantidad de habitantes por vivienda (bucket 1..6, 7+).",
        rows: (data.habDist || []).map((x: any) => ({
          label: x._id,
          value: x.cantidad,
        })),
      },
      {
        title: "Hacinamiento por Semáforo",
        subtitle:
          "Semáforo por relación dormitorios vs ocupación (VERDE/AMARILLO/ROJO).",
        rows: (data.hacColor || []).map((x: any) => ({
          label: x._id,
          value: x.cantidad,
        })),
      },
      {
        title: "Viviendas por Dormitorios",
        subtitle:
          "Distribución de viviendas según cantidad de dormitorios declarados.",
        rows: (data.viviendasPorDorm || []).map((x: any) => ({
          label: String(x._id),
          value: x.cantidad,
        })),
      },
      {
        title: "Viviendas por Estado",
        subtitle:
          "Distribución de viviendas por estado administrativo (ocupada, disponible, etc.).",
        rows: (data.viviendasPorEstado || []).map((x: any) => ({
          label: x._id,
          value: x.cantidad,
        })),
      },
    ];
  }, [data]);

  const scopeLabel =
    barrio === "TODOS" ? "Ámbito: Todos" : `Ámbito: Barrio ${barrio}`;

  // KPI helpers
  const vTotal = data?.viviendas?.total ?? data?.viviendas ?? 0;
  const est = data?.viviendasPorEstado || [];
  const estadoCantidad = (estado: string) =>
    Number(est.find((x: any) => normalizeKey(x._id) === estado)?.cantidad ?? 0);
  const ocupadas = estadoCantidad("OCUPADA");
  const disponibles = estadoCantidad("DISPONIBLE");
  const reservadas = estadoCantidad("RESERVADA");
  const reparacion = estadoCantidad("REPARACION");
  const estadosHabitacionalesVisibles = [
    { title: "Disponibles", value: disponibles, accent: "#1E88E5" },
    { title: "Ocupadas", value: ocupadas, accent: "#43A047" },
    { title: "Reservadas", value: reservadas, accent: "#8E24AA" },
    { title: "Reparación", value: reparacion, accent: "#FB8C00" },
  ];
  const sumaEstadosVisibles = estadosHabitacionalesVisibles.reduce(
    (acc, item) => acc + item.value,
    0
  );
  const otrosEstados = Math.max(0, Number(vTotal || 0) - sumaEstadosVisibles);
  const pctViviendas = (value: number) => {
    const total = Number(vTotal || 0);
    if (!total) return "0.0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };
  const hac = data?.hacColor || [];
  const hacCantidad = (color: string) =>
    Number(hac.find((x: any) => normalizeKey(x._id) === color)?.cantidad ?? 0);
  const verde = hacCantidad("VERDE");
  const amarillo = hacCantidad("AMARILLO");
  const rojo = hacCantidad("ROJO");
  const hacTotal = hac.reduce(
    (acc: number, item: any) => acc + Number(item.cantidad || 0),
    0
  );
  const pctHacinamiento = (value: number) => {
    const total = Number(hacTotal || vTotal || 0);
    if (!total) return "0.0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };
  const hacSemaforos = [
    { title: "Hacinamiento VERDE", value: verde, accent: "#43A047" },
    { title: "Hacinamiento AMARILLO", value: amarillo, accent: "#FBC02D" },
    { title: "Hacinamiento ROJO", value: rojo, accent: "#E53935" },
  ];
  const pt = data?.pedidosTrabajo || [];
  const pedidosTotal = pt.reduce(
    (a: number, b: any) => a + (b.cantidad || 0),
    0
  );

  // Demanda / flujo 01 -> 02
  const dh = data?.demandaHabitacionalStats || null;
  const dhYear = dh?.year ?? year;
  const dhAnexo01 = dh?.anexo01Presentados ?? 0;
  const dhAnexo02 = dh?.anexo02Generados ?? 0;
  const dhBrecha = dh?.brechaHabitacional ?? 0;
  const dhCobertura = dh?.tasaCobertura ?? 0;

  const dhCoberturaRows = (dh?.coberturaRows || []).map((x: any) => ({
    label: x._id,
    value: x.cantidad,
  }));

  // ANEXO_11
  const a11 = data?.anexo11Stats || null;
  const a11Presentados = a11?.presentados ?? 0;
  const a11Aprobados = a11?.aprobados ?? 0;
  const a11Desaprobados = a11?.desaprobados ?? 0;
  const a11Abiertos = a11?.abiertos ?? 0;
  const a11Finalizados = a11?.finalizados ?? 0;

  const a11DecisionRows = (a11?.porDecision || []).map((x: any) => ({
    label: x._id,
    value: x.cantidad,
  }));

  const a11EjecucionRows = (a11?.porEjecucion || []).map((x: any) => ({
    label: x._id,
    value: x.cantidad,
  }));

  const a11PorBarrioRows = (a11?.porBarrio || []).map((x: any) => ({
    label: x._id || "SIN_BARRIO",
    value: x.cantidad,
  }));

  const docPorTipoRows = (docStats?.porTipo || []).map((x: any) => ({
    label: x._id || "SIN_TIPO",
    value: Number(x.cantidad || 0),
  }));

  const docPorEstadoRows = (docStats?.porEstado || []).map((x: any) => ({
    label: x._id || "SIN_ESTADO",
    value: Number(x.cantidad || 0),
  }));

  const docMensualRows = (docStats?.evolucionMensual || []).map((x: any) => ({
    label: MONTH_LABELS[(Number(x.mes || 0) || 1) - 1] || String(x.mes || ""),
    value: Number(x.cantidad || 0),
  }));

  const docTipoEstadoRows = docStats?.tipoEstado || [];
  const docRecientes = docStats?.recientes || [];
  const docTotal = Number(docStats?.total || 0);
  const docTiposActivos = docPorTipoRows.filter((x) => x.value > 0).length;
  const docEstadosActivos = docPorEstadoRows.filter((x) => x.value > 0).length;

const reportBaseName = `estadisticas_${safeFile(
  barrio === "TODOS" ? "todos" : barrio
)}_${year}`;

const actionBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  minHeight: 44,
  boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
};

const selectStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.20)",
  background: "rgba(255,255,255,0.08)",
  backgroundColor: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 700,
  minHeight: 44,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

const infoBoxStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  padding: "12px 14px",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.86)",
  lineHeight: 1.45,
};

const errorBoxStyle: React.CSSProperties = {
  ...infoBoxStyle,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(127,29,29,0.22)",
  color: "#fecaca",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 720,
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.70)",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "#ffffff",
  verticalAlign: "top",
};

function onDownloadBoardCSV() {
  const blocks = [
    {
      titulo: "VISION_EJECUTIVA",
      rows: [
        { label: "Viviendas Totales", value: vTotal },
        { label: "Ocupadas", value: ocupadas },
        { label: "Disponibles", value: disponibles },
        { label: "Hacinamiento VERDE", value: `${verde} (${pctHacinamiento(verde)})` },
        { label: "Hacinamiento AMARILLO", value: `${amarillo} (${pctHacinamiento(amarillo)})` },
        { label: "Hacinamiento ROJO", value: `${rojo} (${pctHacinamiento(rojo)})` },
        { label: "Pedidos de Trabajo (ANEXO_11)", value: a11Presentados || pedidosTotal },
      ],
    },
    {
      titulo: "FLUJO_ANEXO_01_A_ANEXO_02",
      rows: [
        { label: `ANEXO_01 Presentados (${dhYear})`, value: dhAnexo01 },
        { label: `ANEXO_02 Generados (${dhYear})`, value: dhAnexo02 },
        { label: "Brecha de Tramitación", value: dhBrecha },
        { label: "Tasa de Derivación", value: `${dhCobertura}%` },
      ],
    },
    {
      titulo: "DERIVACION_DE_TRAMITES",
      rows: dhCoberturaRows,
    },
    {
      titulo: "ANEXO_11_DECISION_INSPECTOR",
      rows: a11DecisionRows,
    },
    {
      titulo: "ANEXO_11_ESTADO_EJECUCION",
      rows: a11EjecucionRows,
    },
    {
      titulo: "ANEXO_11_POR_BARRIO",
      rows: a11PorBarrioRows,
    },
    {
      titulo: "DISTRIBUCION_HABITANTES_POR_VIVIENDA",
      rows: (charts?.[0]?.rows || []) as Array<{ label: string; value: number }>,
    },
    {
      titulo: "HACINAMIENTO_POR_SEMAFORO",
      rows: (charts?.[1]?.rows || []) as Array<{ label: string; value: number }>,
    },
    {
      titulo: "VIVIENDAS_POR_DORMITORIOS",
      rows: (charts?.[2]?.rows || []) as Array<{ label: string; value: number }>,
    },
    {
      titulo: "VIVIENDAS_POR_ESTADO",
      rows: (charts?.[3]?.rows || []) as Array<{ label: string; value: number }>,
    },
  ];

  const csvRows: string[] = [];
  csvRows.push(`"${ORG_HEADER.replaceAll('"', '""')}"`);
  csvRows.push(`"${ORG_SUBHEADER.replaceAll('"', '""')}"`);
  csvRows.push(`"${scopeLabel.replaceAll('"', '""')}"`);
  csvRows.push(`"Emitido: ${emittedLabel.replaceAll('"', '""')}"`);
  csvRows.push("");
  csvRows.push(`"Seccion","Etiqueta","Valor"`);

  blocks.forEach((block) => {
    (block.rows || []).forEach((row) => {
      csvRows.push(
        `"${String(block.titulo || "").replaceAll('"', '""')}","${String(
          row.label ?? ""
        ).replaceAll('"', '""')}","${String(row.value ?? "").replaceAll('"', '""')}"`
      );
    });
  });

  download(
    `${reportBaseName}.csv`,
    csvRows.join("\n"),
    "text/csv;charset=utf-8"
  );
}

function onDownloadBoardPDF() {
  const popup = window.open("", "_blank", "width=1100,height=900");
  if (!popup) return;

  const esc = (v: unknown) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const sectionList = [
    {
      title: "Visión Ejecutiva",
      items: [
        ["Viviendas Totales", vTotal],
        ["Ocupadas", ocupadas],
        ["Disponibles", disponibles],
        ["Hacinamiento VERDE", `${verde} (${pctHacinamiento(verde)})`],
        ["Hacinamiento AMARILLO", `${amarillo} (${pctHacinamiento(amarillo)})`],
        ["Hacinamiento ROJO", `${rojo} (${pctHacinamiento(rojo)})`],
        ["Pedidos de Trabajo (ANEXO_11)", a11Presentados || pedidosTotal],
      ],
    },
    {
      title: "Flujo ANEXO_01 → ANEXO_02",
      items: [
        [`ANEXO_01 Presentados (${dhYear})`, dhAnexo01],
        [`ANEXO_02 Generados (${dhYear})`, dhAnexo02],
        ["Brecha de Tramitación", dhBrecha],
        ["Tasa de Derivación", `${dhCobertura}%`],
      ],
    },
    {
      title: "Distribuciones",
      items: [
        ...((charts?.[0]?.rows || []) as Array<{ label: string; value: number }>).map((x) => [
          `Habitantes/Vivienda - ${x.label}`,
          x.value,
        ] as const),
        ...((charts?.[1]?.rows || []) as Array<{ label: string; value: number }>).map((x) => [
          `Hacinamiento - ${x.label}`,
          x.value,
        ] as const),
        ...((charts?.[2]?.rows || []) as Array<{ label: string; value: number }>).map((x) => [
          `Dormitorios - ${x.label}`,
          x.value,
        ] as const),
        ...((charts?.[3]?.rows || []) as Array<{ label: string; value: number }>).map((x) => [
          `Estado vivienda - ${x.label}`,
          x.value,
        ] as const),
      ],
    },
    {
      title: "ANEXO_11",
      items: [
        ...a11DecisionRows.map((x) => [`Decisión Inspector - ${x.label}`, x.value] as const),
        ...a11EjecucionRows.map((x) => [`Estado Ejecución - ${x.label}`, x.value] as const),
        ...a11PorBarrioRows.map((x) => [`Pedidos por Barrio - ${x.label}`, x.value] as const),
      ],
    },
  ];

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(ORG_HEADER)} - Reporte</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 32px;
        color: #111827;
        background: #ffffff;
      }
      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
      }
      h2 {
        margin: 0 0 18px 0;
        font-size: 18px;
        color: #374151;
      }
      h3 {
        margin: 28px 0 10px 0;
        font-size: 18px;
        border-bottom: 1px solid #d1d5db;
        padding-bottom: 6px;
      }
      .meta {
        margin-bottom: 18px;
        font-size: 14px;
        color: #4b5563;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 18px;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 8px 10px;
        text-align: left;
        font-size: 14px;
      }
      th {
        background: #f3f4f6;
      }
      .note {
        margin-top: 24px;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <h1>${esc(ORG_HEADER)}</h1>
    <h2>${esc(ORG_SUBHEADER)}</h2>
    <div class="meta">${esc(scopeLabel)} · ${esc(emittedLabel)}</div>

    ${sectionList
      .map(
        (section) => `
          <h3>${esc(section.title)}</h3>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${section.items
                .map(
                  ([k, v]) => `
                    <tr>
                      <td>${esc(k)}</td>
                      <td>${esc(v)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        `
      )
      .join("")}

    <div class="note">
      Documento institucional de uso interno. Para guardarlo como PDF, use la opción “Guardar como PDF” del diálogo de impresión.
      Stock actual de viviendas: estado, dormitorios y hacinamiento reflejan información vigente al momento de emisión.
      Métricas del año seleccionado: flujo ANEXO_01 → ANEXO_02 y ANEXO_11 se calculan por año estadístico.
    </div>
  </body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  popup.focus();
  setTimeout(() => {
    popup.print();
  }, 300);
}  return (
    <div style={{
  padding: 24,
  background: "transparent",
  minHeight: "100vh",
  color: "#eaf0ff"
}}>
      {/* HEADER */}
      <div
        style={{
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  padding: 18,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
}}
      >
        <div style={{ fontSize: 28, fontWeight: 900, color: "#ffffff", lineHeight: 1.15 }}>
  {ORG_HEADER}
</div>
        <div
          style={{
            marginTop: 6,
            fontSize: 16,
fontWeight: 700,
opacity: 0.88,
color: "rgba(255,255,255,0.86)",
lineHeight: 1.45,
          }}
        >
          {ORG_SUBHEADER}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 18, color: "#ffffff" }}>Ámbito:</span>
            <select
  value={barrio}
  onChange={(e) => setBarrio(e.target.value)}
  style={selectStyle}
>
  <option value="TODOS" style={optionStyle}>
    Todos
  </option>
  {barriosSeleccionables.map((b) => (
    <option key={b} value={b} style={optionStyle}>
      {b}
    </option>
  ))}
</select>

            <span style={{ fontWeight: 900, fontSize: 18, color: "#ffffff" }}>Año:</span>
            <select
  value={year}
  onChange={(e) => setYear(Number(e.target.value))}
  style={selectStyle}
>
  {availableYears.map((y) => (
    <option key={y} value={y} style={optionStyle}>
      {y}
    </option>
  ))}
</select>

            <span style={{ fontSize: 15, opacity: 0.82, color: "rgba(255,255,255,0.84)" }}>{emittedLabel}</span>
            {hayBarriosAgrupados ? (
              <span style={{ fontSize: 13, opacity: 0.74, color: "rgba(255,255,255,0.78)" }}>
                OTROS agrupa barrios con baja frecuencia y no se usa como filtro directo.
              </span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <button
    type="button"
    onClick={onDownloadBoardPDF}
    disabled={!data || loading}
    style={{
      ...actionBtnStyle,
      opacity: !data || loading ? 0.56 : 1,
      cursor: !data || loading ? "not-allowed" : "pointer",
    }}
    title="Abre una vista imprimible para guardar como PDF"
  >
    Descargar informe (PDF)
  </button>

  <button
    type="button"
    onClick={onDownloadBoardCSV}
    disabled={!data || loading}
    style={{
      ...actionBtnStyle,
      opacity: !data || loading ? 0.56 : 1,
      cursor: !data || loading ? "not-allowed" : "pointer",
    }}
    title="Descarga el tablero consolidado en CSV"
  >
    Descargar tablero (CSV)
  </button>
</div>
        </div>
      </div>

      {errorMsg ? <div style={errorBoxStyle}>{errorMsg}</div> : null}

      {loading ? (
        <div style={infoBoxStyle}>Cargando estadísticas institucionales...</div>
      ) : null}

      {data ? (
        <>
      <SectionLabel>VISIÓN EJECUTIVA</SectionLabel>

      <div style={infoBoxStyle}>
        <strong>Stock actual de viviendas:</strong> viviendas, estados, dormitorios y
        hacinamiento reflejan la información vigente al momento de emisión.
        <br />
        <strong>Métricas del año seleccionado:</strong> flujo ANEXO_01 → ANEXO_02 y
        ANEXO_11 se calculan por año estadístico.
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
          marginTop: 10,
          justifyItems: "center",
        }}
      >
        <KpiCard
          title="Viviendas Totales"
          value={vTotal}
          accent="#111"
          subtitle={scopeLabel}
        />
        {estadosHabitacionalesVisibles.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            accent={item.accent}
            subtitle={`${pctViviendas(item.value)} del total`}
          />
        ))}
        {otrosEstados > 0 ? (
          <KpiCard
            title="Otros estados"
            value={otrosEstados}
            accent="#9E9E9E"
            subtitle={`${pctViviendas(otrosEstados)} del total`}
          />
        ) : null}
        {hacSemaforos.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            accent={item.accent}
            subtitle={`${pctHacinamiento(item.value)} del total evaluado`}
          />
        ))}
        <KpiCard
          title="Pedidos de Trabajo (ANEXO_11)"
          value={a11Presentados || pedidosTotal}
          accent="#8E24AA"
          subtitle="Presentados"
        />
      </div>

      <SectionLabel>FLUJO DE TRAMITACIÓN</SectionLabel>

      {/* FLUJO ANEXO_01 -> ANEXO_02 */}
      <div
        style={{
  marginTop: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  padding: 20,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
}}
      >
        <div style={{ fontSize: 18, fontWeight: 900 }}>
          Flujo ANEXO_01 → ANEXO_02
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
          Seguimiento anual del pasaje de formularios ANEXO_01 a ANEXO_02
          durante {dhYear}.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <KpiCard
            title={`ANEXO_01 Presentados (${dhYear})`}
            value={dhAnexo01}
            accent="#8E24AA"
            subtitle="Solicitudes ingresadas"
          />

          <KpiCard
            title={`ANEXO_02 Generados (${dhYear})`}
            value={dhAnexo02}
            accent="#43A047"
            subtitle="Trámites derivados"
          />

          <KpiCard
            title="Brecha de Tramitación"
            value={dhBrecha}
            accent="#E53935"
            subtitle="ANEXO_01 sin ANEXO_02"
          />

          <KpiCard
            title="Tasa de Derivación"
            value={`${dhCobertura}%`}
            accent="#1E88E5"
            subtitle="ANEXO_02 sobre ANEXO_01"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Card
            title="Derivación de Trámites"
            subtitle="Relación entre ANEXO_01 presentados y ANEXO_02 generados en el año seleccionado."
          >
            <PieChart
              title="Derivación de Trámites"
              subtitle="Relación entre ANEXO_01 presentados y ANEXO_02 generados en el año seleccionado."
              data={dhCoberturaRows}
              scopeLabel={`Año ${dhYear}`}
            />
          </Card>
        </div>
      </div>

      <SectionLabel>GESTIÓN DOCUMENTAL</SectionLabel>

      <div style={infoBoxStyle}>
        Métricas reales de formularios y anexos sobre FormSubmission. Se calculan por
        año de creación y respetan los filtros visibles; no modifican documentos.
      </div>

      <div
        style={{
          marginTop: 10,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 14,
          padding: 18,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: 900, color: "#ffffff" }}>Tipo:</span>
          <select
            value={docCodigoFiltro}
            onChange={(e) => setDocCodigoFiltro(e.target.value)}
            style={selectStyle}
            disabled={docLoading}
          >
            <option value="TODOS" style={optionStyle}>
              Todos los anexos
            </option>
            {FORMULARIO_CODIGOS.map((codigo) => (
              <option key={codigo} value={codigo} style={optionStyle}>
                {codigo}
              </option>
            ))}
          </select>

          <span style={{ fontWeight: 900, color: "#ffffff" }}>Estado:</span>
          <select
            value={docEstadoFiltro}
            onChange={(e) => setDocEstadoFiltro(e.target.value)}
            style={selectStyle}
            disabled={docLoading}
          >
            <option value="TODOS" style={optionStyle}>
              Todos los estados
            </option>
            {FORMULARIO_ESTADOS.map((estado) => (
              <option key={estado} value={estado} style={optionStyle}>
                {estado}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
            Año {year}
            {barrio === "TODOS" ? " · Todos los barrios" : ` · Barrio ${barrio}`}
          </span>
        </div>
      </div>

      {docErrorMsg ? <div style={errorBoxStyle}>{docErrorMsg}</div> : null}

      {docLoading ? (
        <div style={infoBoxStyle}>Cargando gestión documental...</div>
      ) : null}

      {docStats ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <KpiCard
              title="Formularios del año"
              value={docTotal}
              accent="#8E24AA"
              subtitle="Total según filtros"
            />
            <KpiCard
              title="Tipos con actividad"
              value={docTiposActivos}
              accent="#1E88E5"
              subtitle="Anexos con registros"
            />
            <KpiCard
              title="Estados presentes"
              value={docEstadosActivos}
              accent="#43A047"
              subtitle="Estados en el período"
            />
            <KpiCard
              title="Actividad reciente"
              value={docRecientes.length}
              accent="#FB8C00"
              subtitle="Últimos movimientos listados"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            <Card
              title="Formularios por tipo de anexo"
              subtitle="Comparativa por código de anexo en el año seleccionado."
            >
              <BarChart data={docPorTipoRows} />
            </Card>

            <Card
              title="Formularios por estado"
              subtitle="Distribución por estado administrativo actual."
            >
              <BarChart data={docPorEstadoRows} />
            </Card>

            <Card
              title="Evolución mensual"
              subtitle="Formularios creados por mes en el año seleccionado."
            >
              <BarChart data={docMensualRows} maxRows={12} preserveOrder />
            </Card>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            <Card
              title="Matriz tipo + estado"
              subtitle="Cantidad de formularios agrupados por anexo y estado."
            >
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docTipoEstadoRows.length ? (
                      docTipoEstadoRows.map((row: any, i: number) => (
                        <tr key={`${row.codigo}-${row.estado}-${i}`}>
                          <td style={tdStyle}>{row.codigo || "SIN_TIPO"}</td>
                          <td style={tdStyle}>{row.estado || "SIN_ESTADO"}</td>
                          <td style={tdStyle}>{Number(row.cantidad || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={tdStyle} colSpan={3}>
                          Sin datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card
              title="Actividad reciente"
              subtitle="Últimos formularios actualizados dentro de los filtros aplicados."
            >
              <div style={tableWrapStyle}>
                <table style={{ ...tableStyle, minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Fecha</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Barrio</th>
                      <th style={thStyle}>Vivienda</th>
                      <th style={thStyle}>Persona</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docRecientes.length ? (
                      docRecientes.map((row: any) => (
                        <tr key={row._id}>
                          <td style={tdStyle}>{fmtDateTime(row.updatedAt || row.createdAt)}</td>
                          <td style={tdStyle}>{row.codigo || "SIN_TIPO"}</td>
                          <td style={tdStyle}>
                            {row.estado || "SIN_ESTADO"}
                            {row.estadoInstitucional ? ` / ${row.estadoInstitucional}` : ""}
                          </td>
                          <td style={tdStyle}>{row.barrio || "SIN_BARRIO"}</td>
                          <td style={tdStyle}>{row.vivienda || "—"}</td>
                          <td style={tdStyle}>{row.persona || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={tdStyle} colSpan={6}>
                          Sin actividad reciente para los filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      <SectionLabel>OPERACIÓN Y MANTENIMIENTO</SectionLabel>

      {/* ANEXO_11 */}
      <div
        style={{
  marginTop: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  padding: 20,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
}}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color: "#ffffff" }}>
          Pedidos de Trabajo (ANEXO_11)
        </div>
        <div style={{ marginTop: 8, fontSize: 15, opacity: 0.84, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
          Seguimiento institucional del circuito de pedidos de trabajo.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <KpiCard
            title="Presentados"
            value={a11Presentados}
            accent="#8E24AA"
            subtitle="Ingresados"
          />
          <KpiCard
            title="Aprobados por Inspector"
            value={a11Aprobados}
            accent="#43A047"
            subtitle="Con continuidad operativa"
          />
          <KpiCard
            title="Desaprobados por Inspector"
            value={a11Desaprobados}
            accent="#E53935"
            subtitle="Rechazados post-visita"
          />
          <KpiCard
            title="Aprobados Abiertos"
            value={a11Abiertos}
            accent="#FB8C00"
            subtitle="Pendientes de cierre"
          />
          <KpiCard
            title="Aprobados Finalizados"
            value={a11Finalizados}
            accent="#1E88E5"
            subtitle="Cerrados por ADMIN_GENERAL"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Card
            title="ANEXO_11 — Decisión del Inspector"
            subtitle="Distribución entre aprobados y desaprobados."
          >
            <PieChart
              title="ANEXO_11 — Decisión del Inspector"
              subtitle="Distribución entre aprobados y desaprobados."
              data={a11DecisionRows}
              scopeLabel={scopeLabel}
            />
          </Card>

          <Card
            title="ANEXO_11 — Estado de Ejecución"
            subtitle="Solo pedidos aprobados: abiertos vs finalizados."
          >
            <PieChart
              title="ANEXO_11 — Estado de Ejecución"
              subtitle="Solo pedidos aprobados: abiertos vs finalizados."
              data={a11EjecucionRows}
              scopeLabel={scopeLabel}
            />
          </Card>

          {barrio === "TODOS" ? (
            <Card
              title="ANEXO_11 — Pedidos por Barrio"
              subtitle="Distribución territorial de pedidos presentados."
            >
              <PieChart
                title="ANEXO_11 — Pedidos por Barrio"
                subtitle="Distribución territorial de pedidos presentados."
                data={a11PorBarrioRows}
                scopeLabel={scopeLabel}
              />
            </Card>
          ) : null}
        </div>
      </div>

      <SectionLabel>ANÁLISIS DEL PARQUE HABITACIONAL</SectionLabel>

      {/* GRÁFICOS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 12,
          marginTop: 10,
        }}
      >
        {charts?.map((c, i) => (
          <Card key={i} title={c.title} subtitle={c.subtitle}>
            <PieChart
              title={c.title}
              subtitle={c.subtitle}
              data={c.rows}
              scopeLabel={scopeLabel}
            />
          </Card>
        ))}
      </div>
        </>
      ) : null}
    </div>
  );
}
