// frontend/src/components/anexos/Anexo11ResumenRegistro.tsx
import React from "react";

type Usuario = {
  _id?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  role?: string;
};

type HistEstado = {
  fecha?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  observacion?: string;
  realizadoPor?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function prettyUser(u?: Usuario | null) {
  if (!u) return "—";
  const nom = `${String(u.apellido || "").trim()} ${String(u.nombre || "").trim()}`.trim();
  return nom || u.email || "—";
}

function prettyId(v: unknown) {
  const s = String(v || "").trim();
  if (!s) return "—";
  if (/^[0-9a-fA-F]{24}$/.test(s)) return `…${s.slice(-6)}`;
  return s;
}

function prettyActor(v: unknown, fallback = "Interviniente") {
  const s = String(v || "").trim();
  if (!s) return fallback;

  // Si ya viene algo legible, lo mostramos
  if (!/^[0-9a-fA-F]{24}$/.test(s)) {
    const value = s.trim();
    const upper = value.toUpperCase();

    if (upper === "ADMIN_GENERAL") return "ADMIN GENERAL";
    if (upper === "ADMIN") return "ADMIN";
    if (upper === "JEFE_DE_BARRIO") return "JEFE DE BARRIO";
    if (upper === "INSPECTOR") return "Inspector";
    if (upper === "PERMISIONARIO") return "Permisionario";
    if (upper === "SISTEMA") return "Sistema";

    return value;
  }

  // Si viene ObjectId puro, evitamos mostrarlo
  return fallback;
}

type Props = {
  anexo: {
    _id: string;
    codigo: string;
    estado: string;
    estadoInstitucional?: string | null;
    createdAt?: string;
    updatedAt?: string;
    usuario?: Usuario;
    datos?: any;
    historialEstados?: HistEstado[];
  };
  // opcional: si querés ocultar cosas según rol
  mostrarAdmin?: boolean;
};

const styles = {
  wrapper: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
    color: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#ffffff",
  } as React.CSSProperties,

  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  } as React.CSSProperties,

  sectionDivider: {
    height: 1,
    border: "none",
    margin: "14px 0",
    background: "rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 14,
  } as React.CSSProperties,

  card: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
  } as React.CSSProperties,

  fullCard: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    marginTop: 12,
  } as React.CSSProperties,

  sectionLabel: {
    marginBottom: 10,
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  } as React.CSSProperties,

  fieldRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    marginBottom: 10,
  } as React.CSSProperties,

  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.58)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
  } as React.CSSProperties,

  fieldValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.94)",
    lineHeight: 1.45,
    wordBreak: "break-word" as const,
  } as React.CSSProperties,

  timelineOuter: {
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

  timelineMeta: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    alignItems: "center",
    marginBottom: 6,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
  } as React.CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.86)",
    letterSpacing: "0.04em",
  } as React.CSSProperties,

  timelineText: {
    whiteSpace: "pre-wrap" as const,
    fontSize: 13,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.9)",
  } as React.CSSProperties,

  emptyState: {
    fontSize: 13,
    color: "rgba(255,255,255,0.68)",
  } as React.CSSProperties,
};

export default function Anexo11ResumenRegistro({
  anexo,
  mostrarAdmin = true,
}: Props) {
  const d = anexo.datos || {};

  const iniciadoPor = prettyUser(anexo.usuario);
  const creado = fmtDate(anexo.createdAt);
  const actualizado = fmtDate(anexo.updatedAt);

  const estado = up(anexo.estado);
  const estadoInst = anexo.estadoInstitucional ? up(anexo.estadoInstitucional) : "";

  const vivienda = d.viviendaLabel || d.unidadHabitacional || d.casa || "—";
  const barrio = d.viviendaBarrio || d.inspectorBarrio || "—";

  const permisionario = d.permisionarioNombre || "—";
  const solicitud = d.solicitudDetalle || d.detallePedido || "—";
  const fechaSolicitud = d.fechaSolicitud ? fmtDate(d.fechaSolicitud) : "—";

  const prioridad = d.prioridadInspector || d.prioridad || "—";
  const decisionInspector = d.decisionInspector || "—";
  const responsable = d.responsableTrabajo || "—";
  const finalizadoInspector = d.trabajoFinalizadoInspector ? "SI" : "NO";

  const visitas: any[] = Array.isArray(d.visitasProgramadas) ? d.visitasProgramadas : [];

  const obsInsHist: any[] = Array.isArray(d.observacionesInspectorHistorial)
    ? d.observacionesInspectorHistorial
    : [];

  // Si todavía no creaste historial para admin, igual mostramos el “último texto”
  const obsAdminUlt: string =
    typeof d.observacionesAdminGeneral === "string" ? d.observacionesAdminGeneral.trim() : "";

  const obsAdminHist: any[] = Array.isArray(d.observacionesAdminGeneralHistorial)
    ? d.observacionesAdminGeneralHistorial
    : [];

  const estados: HistEstado[] = Array.isArray(anexo.historialEstados)
    ? anexo.historialEstados
    : [];

  // Armamos un “timeline” unificado (sin perder lo original)
  // - Observaciones Inspector
  // - Visitas
  // - Observaciones Admin
  // - Cambios de estado (historialEstados)
  const timeline: Array<{ fecha?: string; tipo: string; texto: string; actor?: string }> = [];

  for (const o of obsInsHist) {
    timeline.push({
      fecha: o.fecha,
      tipo: "OBS_INSPECTOR",
      texto: String(o.texto || "").trim(),
      actor: o.usuario ? prettyActor(o.usuario, "Inspector") : "Inspector",
    });
  }

  for (const v of visitas) {
    timeline.push({
      fecha: v.creadoAt || v.fechaRegistro || v.fechaProgramada,
      tipo: "VISITA",
      texto: `Visita: ${v.fechaProgramada ? fmtDate(v.fechaProgramada) : "—"} — ${safe(v.observacion)}`,
      actor: v.creadoPor ? prettyActor(v.creadoPor, "Inspector") : "Inspector",
    });
  }

  if (mostrarAdmin) {
    for (const o of obsAdminHist) {
      timeline.push({
        fecha: o.fecha,
        tipo: "OBS_ADMIN",
        texto: String(o.texto || "").trim(),
        actor: o.usuario ? prettyActor(o.usuario, "ADMIN GENERAL") : "ADMIN GENERAL",
      });
    }
  }

  for (const h of estados) {
    timeline.push({
      fecha: h.fecha,
      tipo: "ESTADO",
      texto: String(h.observacion || `${h.estadoAnterior} → ${h.estadoNuevo}`).trim(),
      actor: h.realizadoPor ? prettyActor(h.realizadoPor, "Sistema") : "Sistema",
    });
  }

  timeline.sort((a, b) => {
    const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
    const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return ta - tb;
  });

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>Resumen y registro — ANEXO 11</h3>
      <div style={styles.subtitle}>Vista consolidada del registro</div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.sectionLabel}>Identificación</div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>ID</span>
            <span style={styles.fieldValue}>{prettyId(anexo._id)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Código</span>
            <span style={styles.fieldValue}>{up(anexo.codigo)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Estado</span>
            <span style={styles.fieldValue}>
              {estado}
              {estadoInst ? ` / ${estadoInst}` : ""}
            </span>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionLabel}>Registro base</div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Iniciado por</span>
            <span style={styles.fieldValue}>{iniciadoPor}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Creado</span>
            <span style={styles.fieldValue}>{creado}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Actualizado</span>
            <span style={styles.fieldValue}>{actualizado}</span>
          </div>
        </section>
      </div>

      <hr style={styles.sectionDivider} />

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.sectionLabel}>Ubicación</div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Vivienda / espacio</span>
            <span style={styles.fieldValue}>{safe(vivienda)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Barrio</span>
            <span style={styles.fieldValue}>{safe(barrio)}</span>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionLabel}>Solicitud</div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Permisionario</span>
            <span style={styles.fieldValue}>{safe(permisionario)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Solicitud</span>
            <span style={styles.fieldValue}>{safe(solicitud)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Fecha solicitud</span>
            <span style={styles.fieldValue}>{fechaSolicitud}</span>
          </div>
        </section>
      </div>

      <hr style={styles.sectionDivider} />

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.sectionLabel}>Gestión del inspector</div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Prioridad</span>
            <span style={styles.fieldValue}>{safe(prioridad)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Decisión inspector</span>
            <span style={styles.fieldValue}>{safe(decisionInspector)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Responsable</span>
            <span style={styles.fieldValue}>{safe(responsable)}</span>
          </div>

          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Finalizado por inspector</span>
            <span style={styles.fieldValue}>{finalizadoInspector}</span>
          </div>
        </section>

        {mostrarAdmin && (
          <section style={styles.card}>
            <div style={styles.sectionLabel}>Administrador general</div>

            <div style={{ ...styles.fieldRow, marginBottom: 0 }}>
              <span style={styles.fieldLabel}>Observación ADMIN (última)</span>
              <span style={{ ...styles.fieldValue, whiteSpace: "pre-wrap" }}>
                {obsAdminUlt ? obsAdminUlt : "—"}
              </span>
            </div>
          </section>
        )}
      </div>

      <section style={styles.fullCard}>
        <div style={styles.sectionLabel}>Registro (timeline)</div>

        {timeline.length === 0 ? (
          <div style={styles.emptyState}>No hay eventos registrados todavía.</div>
        ) : (
          <div style={styles.timelineOuter}>
            {timeline.map((t, idx) => (
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
                <div style={styles.timelineMeta}>
                  <span style={styles.badge}>{fmtDate(t.fecha)}</span>
                  <span style={styles.badge}>{t.tipo}</span>
                  {t.actor ? <span style={styles.badge}>{t.actor}</span> : null}
                </div>

                <div style={styles.timelineText}>{t.texto || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}