import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type BrItem = {
  _id: string;
  codigo: string;
  dependencia?: string;
  lugar: string;
  sector?: string;
  tipo: string;
  numero?: string;
  clase: string;
  capacidad: number;
  generoPermitido: string;
  aptoParaGrupoJerarquico?: string;
  observaciones?: string;
  activo: boolean;
  estado: string;
  vigenciaTransitoriaDesde?: string | null;
  vigenciaTransitoriaHasta?: string | null;
  autorizadoPor?: string;
  motivoAltaTransitoria?: string;
  motivoBajaTransitoria?: string;
};

type Plaza = {
  _id: string;
  codigo: string;
  numeroPlaza: number;
  estado: string;
  activo: boolean;
  alojadoActual?: unknown;
  reservaActual?: { usuario?: string | null; anexoId?: string | null } | null;
};

type Vinculos = {
  plazasOcupadas?: number;
  plazasReservadas?: number;
  asignacionesBloqueantes?: number;
  documentosActivos?: number;
  documentosPendientes?: number;
  tieneVinculos?: boolean;
};

type FormState = {
  codigo: string;
  dependencia: string;
  lugar: string;
  sector: string;
  tipo: string;
  numero: string;
  clase: string;
  capacidad: string;
  generoPermitido: string;
  aptoParaGrupoJerarquico: string;
  observaciones: string;
  autorizadoPor: string;
  motivoAltaTransitoria: string;
  motivo: string;
  vigenciaTransitoriaDesde: string;
  vigenciaTransitoriaHasta: string;
};

const emptyForm: FormState = {
  codigo: "BR-",
  dependencia: "TRANSITORIO_BR",
  lugar: "",
  sector: "",
  tipo: "",
  numero: "",
  clase: "C01",
  capacidad: "1",
  generoPermitido: "SIN_RESTRICCION",
  aptoParaGrupoJerarquico: "NO_DEFINIDO",
  observaciones: "",
  autorizadoPor: "",
  motivoAltaTransitoria: "",
  motivo: "",
  vigenciaTransitoriaDesde: "",
  vigenciaTransitoriaHasta: "",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  boxSizing: "border-box",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
};

const thStyle: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 12,
  color: "rgba(255,255,255,0.64)",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
  verticalAlign: "top",
};

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function safe(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function allowed(role: unknown) {
  return up(role) === "ADMIN_GENERAL";
}

function isoDateInput(value: unknown) {
  const text = String(value || "");
  return text ? text.slice(0, 10) : "";
}

function formFromItem(item: BrItem): FormState {
  return {
    codigo: item.codigo || "BR-",
    dependencia: item.dependencia || "TRANSITORIO_BR",
    lugar: item.lugar || "",
    sector: item.sector || "",
    tipo: item.tipo || "",
    numero: item.numero || "",
    clase: item.clase || "C01",
    capacidad: String(item.capacidad || 1),
    generoPermitido: item.generoPermitido || "SIN_RESTRICCION",
    aptoParaGrupoJerarquico: item.aptoParaGrupoJerarquico || "NO_DEFINIDO",
    observaciones: item.observaciones || "",
    autorizadoPor: item.autorizadoPor || "",
    motivoAltaTransitoria: item.motivoAltaTransitoria || "",
    motivo: "",
    vigenciaTransitoriaDesde: isoDateInput(item.vigenciaTransitoriaDesde),
    vigenciaTransitoriaHasta: isoDateInput(item.vigenciaTransitoriaHasta),
  };
}

function buildPayload(form: FormState) {
  return {
    codigo: up(form.codigo),
    dependencia: form.dependencia.trim(),
    lugar: form.lugar.trim(),
    sector: form.sector.trim(),
    tipo: form.tipo.trim(),
    numero: form.numero.trim(),
    clase: up(form.clase),
    capacidad: Number(form.capacidad || 0),
    generoPermitido: up(form.generoPermitido),
    aptoParaGrupoJerarquico: up(form.aptoParaGrupoJerarquico),
    observaciones: form.observaciones.trim(),
    autorizadoPor: form.autorizadoPor.trim(),
    motivoAltaTransitoria: form.motivoAltaTransitoria.trim(),
    motivo: form.motivo.trim(),
    vigenciaTransitoriaDesde: form.vigenciaTransitoriaDesde || null,
    vigenciaTransitoriaHasta: form.vigenciaTransitoriaHasta || null,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export default function AlojamientosTransitoriosBr() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const puedeGestionar = allowed(user?.role);
  const [items, setItems] = useState<BrItem[]>([]);
  const [selected, setSelected] = useState<BrItem | null>(null);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [vinculos, setVinculos] = useState<Vinculos>({});
  const [includeBaja, setIncludeBaja] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const capacidadActual = Number(editing?.capacidad || 0);
  const capacidadNueva = Number(form.capacidad || 0);
  const deltaCapacidad = capacidadNueva - capacidadActual;

  const plazasOrdenadas = useMemo(
    () => [...plazas].sort((a, b) => Number(a.numeroPlaza || 0) - Number(b.numeroPlaza || 0)),
    [plazas]
  );

  async function cargar() {
    if (!puedeGestionar) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await http.get("/alojamientos-transitorios-br", {
        params: includeBaja ? { includeBaja: "true" } : {},
      });
      const list = Array.isArray(res.data?.alojamientos) ? res.data.alojamientos : [];
      setItems(list);
      if (selected) {
        const refreshed = list.find((item: BrItem) => item._id === selected._id) || null;
        setSelected(refreshed);
        if (refreshed) await cargarDetalle(refreshed._id, false);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "No se pudieron cargar los BR transitorios.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function cargarDetalle(id: string, setAsSelected = true) {
    setErrorMsg("");
    try {
      const res = await http.get(`/alojamientos-transitorios-br/${id}`);
      const item = res.data?.alojamiento || null;
      if (setAsSelected) setSelected(item);
      setPlazas(Array.isArray(res.data?.plazas) ? res.data.plazas : []);
      setVinculos(res.data?.vinculos || {});
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "No se pudo cargar el detalle del BR.");
      setPlazas([]);
      setVinculos({});
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeGestionar, includeBaja]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setInfoMsg("");
    setErrorMsg("");
  }

  function openEdit(item: BrItem) {
    setEditing(item);
    setForm(formFromItem(item));
    setFormOpen(true);
    setInfoMsg("");
    setErrorMsg("");
    cargarDetalle(item._id).catch(() => {});
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      if (editing) {
        const res = await http.patch(`/alojamientos-transitorios-br/${editing._id}`, buildPayload(form));
        setInfoMsg("BR actualizado correctamente.");
        setSelected(res.data?.alojamiento || null);
        setFormOpen(false);
      } else {
        const res = await http.post("/alojamientos-transitorios-br", buildPayload(form));
        setInfoMsg("BR creado correctamente.");
        setSelected(res.data?.alojamiento || null);
        setFormOpen(false);
      }
      await cargar();
      if (selected?._id) await cargarDetalle(selected._id, false);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "No se pudo guardar el BR transitorio.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizar(item: BrItem) {
    const motivo = window.prompt(`Motivo obligatorio para finalizar ${item.codigo}:`, "");
    if (!motivo || motivo.trim().length < 5) {
      setErrorMsg("Debe ingresar un motivo de al menos 5 caracteres.");
      return;
    }
    const ok = window.confirm(`Confirma finalizar el uso transitorio de ${item.codigo}?`);
    if (!ok) return;
    setSaving(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      await http.post(`/alojamientos-transitorios-br/${item._id}/finalizar`, { motivo: motivo.trim() });
      setInfoMsg("BR finalizado correctamente.");
      await cargar();
      if (selected?._id === item._id) await cargarDetalle(item._id, false);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "No se pudo finalizar el BR.");
    } finally {
      setSaving(false);
    }
  }

  if (!puedeGestionar) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0, color: "#ffffff" }}>Recurso no disponible</h2>
        <p style={subtitleStyle}>No es posible acceder a la gestion de BR transitorios.</p>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={titleStyle}>Transitorios BR</h1>
          <p style={subtitleStyle}>Gestion operativa de alojamientos transitorios protegidos fuera de Bases Maestras.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" style={secondaryButtonStyle} onClick={() => navigate("/app/admin-general/alojamientos")}>
            Inventario
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={cargar} disabled={loading}>
            Actualizar
          </button>
          <button type="button" style={primaryButtonStyle} onClick={openNew}>
            Nuevo BR
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "rgba(255,255,255,0.82)" }}>
          <input type="checkbox" checked={includeBaja} onChange={(e) => setIncludeBaja(e.target.checked)} />
          Ver finalizados
        </label>
        {loading ? <span style={subtitleStyle}>Cargando...</span> : null}
      </div>

      {errorMsg ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, border: "1px solid rgba(248,113,113,0.30)", background: "rgba(127,29,29,0.18)", color: "#fecaca" }}>
          {errorMsg}
        </div>
      ) : null}
      {infoMsg ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, border: "1px solid rgba(34,197,94,0.30)", background: "rgba(20,83,45,0.20)", color: "#bbf7d0" }}>
          {infoMsg}
        </div>
      ) : null}

      <div style={{ marginTop: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
          <thead>
            <tr>
              <th style={thStyle}>Codigo</th>
              <th style={thStyle}>Lugar</th>
              <th style={thStyle}>Sector</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Cap.</th>
              <th style={thStyle}>Genero</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!items.length ? (
              <tr><td style={tdStyle} colSpan={8}>Sin BR transitorios para mostrar.</td></tr>
            ) : null}
            {items.map((item) => (
              <tr key={item._id}>
                <td style={{ ...tdStyle, fontWeight: 800, color: "#ffffff" }}>{safe(item.codigo)}</td>
                <td style={tdStyle}>{safe(item.lugar)}</td>
                <td style={tdStyle}>{safe(item.sector)}</td>
                <td style={tdStyle}>{safe(item.tipo)}</td>
                <td style={tdStyle}>{Number(item.capacidad || 0)}</td>
                <td style={tdStyle}>{safe(item.generoPermitido)}</td>
                <td style={tdStyle}><span style={badgeStyle}>{safe(item.estado)}</span></td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={{ ...secondaryButtonStyle, padding: "7px 10px" }} onClick={() => cargarDetalle(item._id)}>
                      Ver
                    </button>
                    {item.activo && up(item.estado) !== "BAJA" ? (
                      <>
                        <button type="button" style={{ ...secondaryButtonStyle, padding: "7px 10px" }} onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button type="button" style={{ ...secondaryButtonStyle, padding: "7px 10px", borderColor: "rgba(248,113,113,0.34)" }} onClick={() => finalizar(item)} disabled={saving}>
                          Finalizar
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div style={{ marginTop: 22, padding: 16, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
          <h2 style={{ marginTop: 0, color: "#ffffff", fontSize: 20 }}>{selected.codigo}</h2>
          <p style={subtitleStyle}>
            {selected.lugar} / {safe(selected.sector)} / {selected.tipo} · Capacidad {Number(selected.capacidad || 0)}
          </p>
          {vinculos.tieneVinculos ? (
            <div style={{ marginTop: 12, color: "#fde68a" }}>
              Tiene vinculos: ocupadas {Number(vinculos.plazasOcupadas || 0)}, reservadas {Number(vinculos.plazasReservadas || 0)}, asignaciones {Number(vinculos.asignacionesBloqueantes || 0)}, documentos activos {Number(vinculos.documentosActivos || vinculos.documentosPendientes || 0)}.
            </div>
          ) : (
            <div style={{ marginTop: 12, color: "#bbf7d0" }}>Sin vinculos bloqueantes detectados.</div>
          )}
          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Plaza</th>
                  <th style={thStyle}>Numero</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Activo</th>
                  <th style={thStyle}>Reserva</th>
                </tr>
              </thead>
              <tbody>
                {!plazasOrdenadas.length ? (
                  <tr><td style={tdStyle} colSpan={5}>Sin plazas registradas.</td></tr>
                ) : null}
                {plazasOrdenadas.map((plaza) => (
                  <tr key={plaza._id}>
                    <td style={{ ...tdStyle, fontWeight: 800, color: "#ffffff" }}>{safe(plaza.codigo)}</td>
                    <td style={tdStyle}>{Number(plaza.numeroPlaza || 0)}</td>
                    <td style={tdStyle}><span style={badgeStyle}>{safe(plaza.estado)}</span></td>
                    <td style={tdStyle}>{plaza.activo ? "SI" : "NO"}</td>
                    <td style={tdStyle}>{plaza.reservaActual?.usuario || plaza.reservaActual?.anexoId ? "SI" : "NO"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <form onSubmit={submitForm} style={{ marginTop: 22, padding: 16, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
          <h2 style={{ marginTop: 0, color: "#ffffff", fontSize: 20 }}>{editing ? `Editar ${editing.codigo}` : "Nuevo BR"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <Field label="Codigo">
              <input style={inputStyle} value={form.codigo} disabled={Boolean(editing)} onChange={(e) => setForm((p) => ({ ...p, codigo: up(e.target.value) }))} />
            </Field>
            <Field label="Lugar">
              <input style={inputStyle} value={form.lugar} onChange={(e) => setForm((p) => ({ ...p, lugar: e.target.value }))} required />
            </Field>
            <Field label="Sector">
              <input style={inputStyle} value={form.sector} onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))} />
            </Field>
            <Field label="Tipo">
              <input style={inputStyle} value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} required />
            </Field>
            <Field label="Capacidad">
              <input style={inputStyle} type="number" min={1} value={form.capacidad} onChange={(e) => setForm((p) => ({ ...p, capacidad: e.target.value }))} required />
            </Field>
            <Field label="Clase">
              <select style={inputStyle} value={form.clase} onChange={(e) => setForm((p) => ({ ...p, clase: e.target.value }))}>
                {["C01", "C02", "C03", "C04", "CUSO"].map((x) => <option key={x} value={x} style={optionStyle}>{x}</option>)}
              </select>
            </Field>
            <Field label="Genero">
              <select style={inputStyle} value={form.generoPermitido} onChange={(e) => setForm((p) => ({ ...p, generoPermitido: e.target.value }))}>
                {["MASCULINO", "FEMENINO", "SIN_RESTRICCION", "NO_ESPECIFICADO"].map((x) => <option key={x} value={x} style={optionStyle}>{x}</option>)}
              </select>
            </Field>
            <Field label="Grupo jerarquico">
              <select style={inputStyle} value={form.aptoParaGrupoJerarquico} onChange={(e) => setForm((p) => ({ ...p, aptoParaGrupoJerarquico: e.target.value }))}>
                {["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"].map((x) => <option key={x} value={x} style={optionStyle}>{x}</option>)}
              </select>
            </Field>
            <Field label="Autorizante">
              <input style={inputStyle} value={form.autorizadoPor} onChange={(e) => setForm((p) => ({ ...p, autorizadoPor: e.target.value }))} />
            </Field>
            <Field label="Vigencia desde">
              <input style={inputStyle} type="date" value={form.vigenciaTransitoriaDesde} onChange={(e) => setForm((p) => ({ ...p, vigenciaTransitoriaDesde: e.target.value }))} />
            </Field>
            <Field label="Vigencia hasta">
              <input style={inputStyle} type="date" value={form.vigenciaTransitoriaHasta} onChange={(e) => setForm((p) => ({ ...p, vigenciaTransitoriaHasta: e.target.value }))} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label={editing ? "Motivo de actualizacion" : "Motivo de alta transitoria"}>
              <textarea
                style={{ ...inputStyle, minHeight: 76 }}
                value={editing ? form.motivo : form.motivoAltaTransitoria}
                onChange={(e) => setForm((p) => editing ? { ...p, motivo: e.target.value } : { ...p, motivoAltaTransitoria: e.target.value })}
                required={!editing}
              />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Observaciones">
              <textarea style={{ ...inputStyle, minHeight: 76 }} value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} />
            </Field>
          </div>
          {editing && deltaCapacidad > 0 ? (
            <div style={{ marginTop: 12, color: "#bbf7d0" }}>Se crearan {deltaCapacidad} plazas faltantes.</div>
          ) : null}
          {editing && deltaCapacidad < 0 ? (
            <div style={{ marginTop: 12, color: "#fde68a" }}>Se intentara baja logica de {Math.abs(deltaCapacidad)} plazas excedentes. Si tienen vinculos, se bloqueara.</div>
          ) : null}
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" style={primaryButtonStyle} disabled={saving}>
              Guardar
            </button>
            <button type="button" style={secondaryButtonStyle} onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
