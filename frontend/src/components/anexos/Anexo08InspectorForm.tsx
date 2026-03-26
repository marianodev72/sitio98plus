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
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    background: "#fafafa",
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 13,
    display: "block",
    marginBottom: 4,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={blockStyle}>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12 }}>R.G-6-002 PÚBLICO</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>ANEXO 08</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            ACTA DE INSPECCIÓN PREVIA DE VIVIENDA FISCAL DE LA ARMADA
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <label style={labelStyle}>Permisionario</label>
            <input
              type="text"
              value={safe(datos.permisionarioNombre)}
              disabled
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Grado</label>
            <input
              type="text"
              value={safe(datos.gradoPermisionario)}
              disabled={disabled}
              onChange={(e) => setField("gradoPermisionario", e.target.value)}
              style={{ width: "100%" }}
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
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Inspector</label>
            <input
              type="text"
              value={safe(datos.inspectorNombre)}
              disabled
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              value={safe(datos.direccion)}
              disabled
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Localidad</label>
            <input
              type="text"
              value={safe(datos.localidad)}
              disabled
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Provincia</label>
            <input
              type="text"
              value={safe(datos.provincia)}
              disabled
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Lugar de inspección</label>
            <input
              type="text"
              value={safe(datos.lugarInspeccion || datos.lugarFirma)}
              disabled={disabled}
              onChange={(e) => setField("lugarInspeccion", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Fecha de inspección</label>
            <input
              type="date"
              value={safe(datos.fechaInspeccion || datos.fechaFirma)}
              disabled={disabled}
              onChange={(e) => setField("fechaInspeccion", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>
          1. Reparaciones y/o mantenimientos a cargo de la Alcaldía
        </h4>

        {reparacionesArmada.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <textarea
              value={item}
              disabled={disabled}
              onChange={(e) =>
                setListaItem("reparacionesArmada", idx, e.target.value)
              }
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
              placeholder={`Punto 1 - Ítem ${idx + 1}`}
            />
            {!disabled && reparacionesArmada.length > 1 && (
              <button
                type="button"
                onClick={() => removeListaItem("reparacionesArmada", idx)}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <button type="button" onClick={() => addListaItem("reparacionesArmada")}>
            + Agregar ítem
          </button>
        )}
      </div>

      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>
          2. Reparaciones y/o mantenimientos a cargo del Permisionario
        </h4>

        {reparacionesPermisionario.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <textarea
              value={item}
              disabled={disabled}
              onChange={(e) =>
                setListaItem("reparacionesPermisionario", idx, e.target.value)
              }
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
              placeholder={`Punto 2 - Ítem ${idx + 1}`}
            />
            {!disabled && reparacionesPermisionario.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  removeListaItem("reparacionesPermisionario", idx)
                }
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
          >
            + Agregar ítem
          </button>
        )}
      </div>

      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 10px 0" }}>Representantes del permisionario</h4>

        {[["Representante I", "representante1"], ["Representante II", "representante2"]].map(
          ([title, repKey]) => {
            const rep = repKey === "representante1" ? rep1 : rep2;
            return (
              <div key={repKey} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div style={{ gridColumn: "1 / span 2" }}>
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
                      style={{ width: "100%" }}
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
                      style={{ width: "100%" }}
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
                      style={{ width: "100%" }}
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
                      style={{ width: "100%" }}
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
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>Observaciones del inspector</h4>
        <textarea
          rows={5}
          value={safe(datos.observacionesInspector)}
          disabled={disabled}
          onChange={(e) => setField("observacionesInspector", e.target.value)}
          style={{ width: "100%", resize: "vertical" }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 8,
            marginTop: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Lugar</label>
            <input
              type="text"
              value={safe(datos.lugarFirma || datos.lugarInspeccion)}
              disabled={disabled}
              onChange={(e) => setField("lugarFirma", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              value={safe(datos.fechaFirma || datos.fechaInspeccion)}
              disabled={disabled}
              onChange={(e) => setField("fechaFirma", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {onEnviar && !disabled && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.8 }}>
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
            style={{ fontWeight: 700, padding: "8px 12px" }}
          >
            {enviando ? "Enviando…" : enviarLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default Anexo08InspectorForm;