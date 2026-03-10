//frontend/src/components/anexos/Anexo11ResumenRegistro.tsx
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

export default function Anexo11ResumenRegistro({ anexo, mostrarAdmin = true }: Props) {
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

  const estados: HistEstado[] = Array.isArray(anexo.historialEstados) ? anexo.historialEstados : [];

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
      actor: o.usuario ? prettyId(o.usuario) : undefined,
    });
  }

  for (const v of visitas) {
    timeline.push({
      fecha: v.creadoAt || v.fechaRegistro || v.fechaProgramada,
      tipo: "VISITA",
      texto: `Visita: ${v.fechaProgramada ? fmtDate(v.fechaProgramada) : "—"} — ${safe(v.observacion)}`,
      actor: v.creadoPor ? prettyId(v.creadoPor) : undefined,
    });
  }

  if (mostrarAdmin) {
    for (const o of obsAdminHist) {
      timeline.push({
        fecha: o.fecha,
        tipo: "OBS_ADMIN",
        texto: String(o.texto || "").trim(),
        actor: o.usuario ? prettyId(o.usuario) : undefined,
      });
    }
  }

  for (const h of estados) {
    timeline.push({
      fecha: h.fecha,
      tipo: "ESTADO",
      texto: String(h.observacion || `${h.estadoAnterior} → ${h.estadoNuevo}`).trim(),
      actor: h.realizadoPor ? prettyId(h.realizadoPor) : undefined,
    });
  }

  timeline.sort((a, b) => {
    const ta = a.fecha ? new Date(a.fecha).getTime() : 0;
    const tb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return ta - tb;
  });

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #ddd",
        background: "#fafafa",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Resumen y registro — ANEXO 11</h3>

      <div style={{ fontSize: 13, lineHeight: 1.35 }}>
        <div>
          <b>ID:</b> {prettyId(anexo._id)} &nbsp;|&nbsp; <b>Código:</b> {up(anexo.codigo)}
        </div>
        <div>
          <b>Estado:</b> {estado}
          {estadoInst ? ` / ${estadoInst}` : ""}
        </div>
        <div>
          <b>Iniciado por:</b> {iniciadoPor} &nbsp;|&nbsp; <b>Creado:</b> {creado}
        </div>
        <div>
          <b>Actualizado:</b> {actualizado}
        </div>

        <hr style={{ margin: "10px 0" }} />

        <div>
          <b>Vivienda / Espacio:</b> {safe(vivienda)} &nbsp;|&nbsp; <b>Barrio:</b> {safe(barrio)}
        </div>
        <div>
          <b>Permisionario:</b> {safe(permisionario)}
        </div>
        <div>
          <b>Solicitud:</b> {safe(solicitud)}
        </div>
        <div>
          <b>Fecha solicitud:</b> {fechaSolicitud}
        </div>

        <hr style={{ margin: "10px 0" }} />

        <div>
          <b>Prioridad:</b> {safe(prioridad)} &nbsp;|&nbsp; <b>Decisión Inspector:</b>{" "}
          {safe(decisionInspector)}
        </div>
        <div>
          <b>Responsable:</b> {safe(responsable)} &nbsp;|&nbsp; <b>Finalizado por inspector:</b>{" "}
          {finalizadoInspector}
        </div>

        {mostrarAdmin && (
          <>
            <hr style={{ margin: "10px 0" }} />
            <div>
              <b>Observación ADMIN (última):</b> {obsAdminUlt ? obsAdminUlt : "—"}
            </div>
          </>
        )}

        <hr style={{ margin: "10px 0" }} />

        <div style={{ marginBottom: 6 }}>
          <b>Registro (timeline):</b>
        </div>

        {timeline.length === 0 ? (
          <div style={{ fontSize: 12 }}>No hay eventos registrados todavía.</div>
        ) : (
          <div
            style={{
              border: "1px solid #eee",
              background: "#fff",
              borderRadius: 8,
              padding: 10,
              maxHeight: 320,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {timeline.map((t, idx) => (
              <div key={idx} style={{ padding: "6px 0", borderBottom: "1px dashed #eee" }}>
                <div>
                  <b>{fmtDate(t.fecha)}</b> &nbsp;·&nbsp; <b>{t.tipo}</b>
                  {t.actor ? ` · ${t.actor}` : ""}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{t.texto || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
