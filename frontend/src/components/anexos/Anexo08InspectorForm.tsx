// frontend/src/components/anexos/Anexo08InspectorForm.tsx

import React, { useMemo } from "react";

export interface Anexo08Representante {
  apellidoNombres?: string;
  grado?: string;
  mr?: string;
  destino?: string;
  telefono?: string;
}

export interface Anexo08Datos {
  anexo03Id?: string;
  viviendaId?: string;
  permisionarioId?: string;

  viviendaCodigo?: string;
  unidadHabitacional?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;

  permisionarioNombre?: string;
  gradoPermisionario?: string;
  inspectorNombre?: string;

  lugarInspeccion?: string;
  fechaInspeccion?: string; // yyyy-mm-dd

  reparacionesArmada?: string[];
  reparacionesPermisionario?: string[];

  observacionesInspector?: string;
  observacionesPermisionario?: string;
  observacionesAdminGeneral?: string;

  representante1?: Anexo08Representante;
  representante2?: Anexo08Representante;

  lugarFirma?: string;
  fechaFirma?: string; // yyyy-mm-dd
}

interface Props {
  value: Anexo08Datos;
  onChange: (next: Anexo08Datos) => void;
  readOnly?: boolean;

  onEnviar?: (payload: Anexo08Datos) => void | Promise<void>;
  enviando?: boolean;
  enviarLabel?: string;
  canEnviar?: boolean;
  validarAntesDeEnviar?: boolean;
}

function safe(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function Anexo08InspectorForm({
  value,
  onChange,
  readOnly = false,
  onEnviar,
  enviando = false,
  enviarLabel = "Guardar / enviar ANEXO_08",
  canEnviar,
  validarAntesDeEnviar = true,
}: Props) {
  const datos = value || {};
  const disabled = !!readOnly;

  function setField<K extends keyof Anexo08Datos>(key: K, val: Anexo08Datos[K]) {
    onChange({ ...datos, [key]: val });
  }

  function getLista(key: "reparacionesArmada" | "reparacionesPermisionario"): string[] {
    const raw = datos[key];
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [""];
  }

  function updateLista(
    key: "reparacionesArmada" | "reparacionesPermisionario",
    nextList: string[]
  ) {
    const clean = nextList.length ? nextList : [""];
    setField(key, clean);
  }

  function setListaItem(
    key: "reparacionesArmada" | "reparacionesPermisionario",
    index: number,
    text: string
  ) {
    const list = [...getLista(key)];
    list[index] = text;
    updateLista(key, list);
  }

  function addListaItem(key: "reparacionesArmada" | "reparacionesPermisionario") {
    updateLista(key, [...getLista(key), ""]);
  }

  function removeListaItem(
    key: "reparacionesArmada" | "reparacionesPermisionario",
    index: number
  ) {
    updateLista(
      key,
      getLista(key).filter((_, i) => i !== index)
    );
  }

  function setRepresentanteField(
    repKey: "representante1" | "representante2",
    field: keyof Anexo08Representante,
    val: string
  ) {
    const curr = datos[repKey] || {};
    setField(repKey, { ...curr, [field]: val });
  }

  const reparacionesArmada = getLista("reparacionesArmada");
  const reparacionesPermisionario = getLista("reparacionesPermisionario");

  const rep1 = datos.representante1 || {};
  const rep2 = datos.representante2 || {};

  const canEnviarComputed = useMemo(() => {
    if (typeof canEnviar === "boolean") return canEnviar;
    if (!validarAntesDeEnviar) return true;

    const permisionario = String(datos.permisionarioNombre || "").trim();
    const inspector = String(datos.inspectorNombre || "").trim();
    const lugar = String(datos.lugarFirma || datos.lugarInspeccion || "").trim();
    const fecha = String(datos.fechaFirma || datos.fechaInspeccion || "").trim();

    return !!permisionario && !!inspector && !!lugar && !!fecha;
  }, [canEnviar, validarAntesDeEnviar, datos]);

  async function handleEnviar() {
    if (!onEnviar || disabled || !canEnviarComputed) return;
    await onEnviar({ ...datos });
  }

  const blockStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.2)",
    color: "#f8fafc",
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(226,232,240,0.72)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  };

  const headingStyle: React.CSSProperties = {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.02em",
    margin: "0 0 10px 0",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    background: "rgba(15,23,42,0.72)",
    color: "#f8fafc",
    padding: "10px 12px",
    minWidth: 0,
    outline: "none",
    colorScheme: "dark",
  };

  const readOnlyInputStyle: React.CSSProperties = {
    ...inputStyle,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(226,232,240,0.82)",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    lineHeight: 1.45,
  };

  const fieldGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    minWidth: 0,
  };

  const fullSpanStyle: React.CSSProperties = {
    gridColumn: "1 / -1",
    minWidth: 0,
  };

  const listRowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    minWidth: 0,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.08)",
    color: "#f8fafc",
    fontWeight: 700,
    padding: "9px 12px",
    cursor: "pointer",
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...secondaryButtonStyle,
    borderColor: "rgba(248,113,113,0.35)",
    color: "#fecaca",
  };

  const submitBarStyle: React.CSSProperties = {
    position: "sticky",
    bottom: 0,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    background: "rgba(15,23,42,0.94)",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 -14px 32px rgba(0,0,0,0.28)",
  };

  const submitHintStyle: React.CSSProperties = {
    color: "rgba(226,232,240,0.74)",
    fontSize: 12,
    minWidth: 220,
    flex: "1 1 260px",
  };

  const submitButtonStyle: React.CSSProperties = {
    ...secondaryButtonStyle,
    background: "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.9))",
    borderColor: "rgba(125,211,252,0.36)",
    padding: "10px 16px",
  };

  return (
    <div style={{ display: "grid", gap: 12, width: "100%", minWidth: 0 }}>
      <div style={blockStyle}>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12 }}>R.G-6-002 PÚBLICO</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>ANEXO 08</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            ACTA DE INSPECCIÓN PREVIA DE VIVIENDA FISCAL DE LA ARMADA
          </div>
        </div>

        <div style={fieldGridStyle}>
          <div>
            <label style={labelStyle}>Permisionario</label>
            <input
              type="text"
              value={safe(datos.permisionarioNombre)}
              disabled
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Grado</label>
            <input
              type="text"
              value={safe(datos.gradoPermisionario)}
              disabled={disabled}
              onChange={(e) => setField("gradoPermisionario", e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Unidad habitacional</label>
            <input
              type="text"
              value={safe(
                datos.unidadHabitacional || datos.viviendaCodigo
              )}
              disabled
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Inspector</label>
            <input
              type="text"
              value={safe(datos.inspectorNombre)}
              disabled
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          <div style={fullSpanStyle}>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              value={safe(datos.direccion)}
              disabled
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Localidad</label>
            <input
              type="text"
              value={safe(datos.localidad)}
              disabled
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Provincia</label>
            <input
              type="text"
              value={safe(datos.provincia)}
              disabled
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Lugar de inspección</label>
            <input
              type="text"
              value={safe(datos.lugarInspeccion || datos.lugarFirma)}
              disabled={disabled}
              onChange={(e) => setField("lugarInspeccion", e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Fecha de inspección</label>
            <input
              type="date"
              value={safe(datos.fechaInspeccion || datos.fechaFirma)}
              disabled={disabled}
              onChange={(e) => setField("fechaInspeccion", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={blockStyle}>
        <h4 style={headingStyle}>
          1. Reparaciones y/o mantenimientos a cargo de la Alcaldía
        </h4>

        {reparacionesArmada.map((item, idx) => (
          <div key={idx} style={listRowStyle}>
            <textarea
              value={item}
              disabled={disabled}
              onChange={(e) =>
                setListaItem("reparacionesArmada", idx, e.target.value)
              }
              rows={3}
              style={{ ...textareaStyle, flex: "1 1 260px" }}
              placeholder={`Punto 1 - Ítem ${idx + 1}`}
            />
            {!disabled && reparacionesArmada.length > 1 && (
              <button
                type="button"
                onClick={() => removeListaItem("reparacionesArmada", idx)}
                style={dangerButtonStyle}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={() => addListaItem("reparacionesArmada")}
            style={secondaryButtonStyle}
          >
            + Agregar ítem
          </button>
        )}
      </div>

      <div style={blockStyle}>
        <h4 style={headingStyle}>
          2. Reparaciones y/o mantenimientos a cargo del Permisionario
        </h4>

        {reparacionesPermisionario.map((item, idx) => (
          <div key={idx} style={listRowStyle}>
            <textarea
              value={item}
              disabled={disabled}
              onChange={(e) =>
                setListaItem("reparacionesPermisionario", idx, e.target.value)
              }
              rows={3}
              style={{ ...textareaStyle, flex: "1 1 260px" }}
              placeholder={`Punto 2 - Ítem ${idx + 1}`}
            />
            {!disabled && reparacionesPermisionario.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  removeListaItem("reparacionesPermisionario", idx)
                }
                style={dangerButtonStyle}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={() => addListaItem("reparacionesPermisionario")}
            style={secondaryButtonStyle}
          >
            + Agregar ítem
          </button>
        )}
      </div>

      <div style={blockStyle}>
        <h4 style={headingStyle}>Representantes del permisionario</h4>

        {[["Representante I", "representante1"], ["Representante II", "representante2"]].map(
          ([title, repKey]) => {
            const rep = repKey === "representante1" ? rep1 : rep2;
            return (
              <div key={repKey} style={{ marginBottom: 16 }}>
                <div style={{ color: "#f8fafc", fontWeight: 800, marginBottom: 10 }}>{title}</div>

                <div style={fieldGridStyle}>
                  <div style={fullSpanStyle}>
                    <label style={labelStyle}>Apellido y nombres</label>
                    <input
                      type="text"
                      value={safe(rep.apellidoNombres)}
                      disabled={disabled}
                      onChange={(e) =>
                        setRepresentanteField(
                          repKey as "representante1" | "representante2",
                          "apellidoNombres",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Grado</label>
                    <input
                      type="text"
                      value={safe(rep.grado)}
                      disabled={disabled}
                      onChange={(e) =>
                        setRepresentanteField(
                          repKey as "representante1" | "representante2",
                          "grado",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>M.R.</label>
                    <input
                      type="text"
                      value={safe(rep.mr)}
                      disabled={disabled}
                      onChange={(e) =>
                        setRepresentanteField(
                          repKey as "representante1" | "representante2",
                          "mr",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Destino</label>
                    <input
                      type="text"
                      value={safe(rep.destino)}
                      disabled={disabled}
                      onChange={(e) =>
                        setRepresentanteField(
                          repKey as "representante1" | "representante2",
                          "destino",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input
                      type="text"
                      value={safe(rep.telefono)}
                      disabled={disabled}
                      onChange={(e) =>
                        setRepresentanteField(
                          repKey as "representante1" | "representante2",
                          "telefono",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      <div style={blockStyle}>
        <h4 style={headingStyle}>Observaciones del inspector</h4>
        <textarea
          rows={5}
          value={safe(datos.observacionesInspector)}
          disabled={disabled}
          onChange={(e) => setField("observacionesInspector", e.target.value)}
          style={textareaStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 12,
            minWidth: 0,
          }}
        >
          <div>
            <label style={labelStyle}>Lugar</label>
            <input
              type="text"
              value={safe(datos.lugarFirma || datos.lugarInspeccion)}
              disabled={disabled}
              onChange={(e) => setField("lugarFirma", e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              value={safe(datos.fechaFirma || datos.fechaInspeccion)}
              disabled={disabled}
              onChange={(e) => setField("fechaFirma", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {onEnviar && !disabled && (
        <div style={submitBarStyle}>
          <div style={submitHintStyle}>
            {!canEnviarComputed && validarAntesDeEnviar ? (
              <span>
                Completá al menos <b>Permisionario</b>, <b>Inspector</b>, <b>Lugar</b> y <b>Fecha</b>.
              </span>
            ) : (
              <span>Listo para enviar.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando || !canEnviarComputed}
            style={{
              ...submitButtonStyle,
              cursor: enviando || !canEnviarComputed ? "not-allowed" : "pointer",
              opacity: enviando || !canEnviarComputed ? 0.58 : 1,
            }}
          >
            {enviando ? "Enviando…" : enviarLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default Anexo08InspectorForm;
