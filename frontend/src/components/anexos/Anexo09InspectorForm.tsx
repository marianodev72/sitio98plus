// frontend/src/components/anexos/Anexo09InspectorForm.tsx
import React, { useEffect, useState } from "react";
import { Anexo03Datos } from "./Anexo03InspectorForm";

type SiNo = "SI" | "NO" | "";
type EstadoMBR = "" | "MB" | "B" | "R" | "M";

interface Props {
  value: Anexo03Datos;
  onChange: (next: Anexo03Datos) => void;
  readOnly?: boolean;
}

function up<T extends string>(v: T | undefined | null): T | "" {
  return (v || "").toUpperCase().trim() as T | "";
}

const siNoOptions: SiNo[] = ["SI", "NO", ""];
const estadosMBR: EstadoMBR[] = ["MB", "B", "R", "M", ""];

export default function Anexo09InspectorForm({
  value,
  onChange,
  readOnly,
}: Props) {
  const datos = value || {};

  // ---- helpers de escritura ----
  function setField<K extends keyof Anexo03Datos>(key: K, val: Anexo03Datos[K]) {
    onChange({ ...datos, [key]: val });
  }

  function setMaterialField(
    key: keyof NonNullable<Anexo03Datos["material"]>,
    val: SiNo
  ) {
    const curr = datos.material || {};
    setField("material", { ...curr, [key]: val });
  }

  function setDocField(
    key: keyof NonNullable<Anexo03Datos["documentacion"]>,
    val: SiNo
  ) {
    const curr = datos.documentacion || {};
    setField("documentacion", { ...curr, [key]: val });
  }

  function setMedidorField(
    key: keyof NonNullable<Anexo03Datos["medidores"]>,
    val: string
  ) {
    const curr = datos.medidores || {};
    setField("medidores", { ...curr, [key]: val });
  }

  function setEstadoField(
    key: keyof NonNullable<Anexo03Datos["estadoSistemas"]>,
    val: EstadoMBR
  ) {
    const curr = datos.estadoSistemas || {};
    setField("estadoSistemas", { ...curr, [key]: val });
  }

  const material = datos.material || {};
  const doc = datos.documentacion || {};
  const med = datos.medidores || {};
  const est = datos.estadoSistemas || {};

  const disabled = !!readOnly;

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

  const smallHelp: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.7,
  };

  // ---- Novedades como lista dinámica, pero guardadas en novedadesTexto ----
  const [novedadesItems, setNovedadesItems] = useState<string[]>(() => {
    const base = (datos.novedadesTexto || "").trim();
    if (!base) return [""];
    return base.split(/\r?\n/);
  });

  useEffect(() => {
    // mantenemos sincronizado con value cuando cambia desde afuera
    const base = (datos.novedadesTexto || "").trim();
    if (!base) {
      setNovedadesItems([""]);
    } else {
      setNovedadesItems(base.split(/\r?\n/));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.novedadesTexto]);

  function updateNovedades(items: string[]) {
    setNovedadesItems(items);
    const texto = items
      .map((x) => x.trim())
      .filter((x) => x)
      .join("\n");
    setField("novedadesTexto", texto);
  }

  const tituloActa = "ACTA DE ENTREGA DE VIVIENDA FISCAL DE LA ARMADA";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ENCABEZADO – datos generales */}
      <div style={blockStyle}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12 }}>R.G-6-002 PÚBLICO</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>ANEXO 09</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{tituloActa}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            (3.07., incs. 2., 3. y 5.; 5.09., inc. 2. y 5.16., inc. 3.)
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
            <label style={labelStyle}>Permisionario saliente</label>
            <input
              type="text"
              value={datos.permisionarioNombre || ""}
              disabled={disabled}
              onChange={(e) =>
                setField("permisionarioNombre", e.target.value)
              }
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Unidad habitacional</label>
            <input
              type="text"
              value={datos.unidadHabitacional || ""}
              disabled={true}
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={labelStyle}>Dirección unidad habitacional</label>
            <input
              type="text"
              value={datos.direccion || ""}
              disabled={disabled}
              onChange={(e) => setField("direccion", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Localidad</label>
            <input
              type="text"
              value={datos.localidad || ""}
              disabled={disabled}
              onChange={(e) => setField("localidad", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Provincia</label>
            <input
              type="text"
              value={datos.provincia || ""}
              disabled={disabled}
              onChange={(e) => setField("provincia", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={labelStyle}>Inspector</label>
            <input
              type="text"
              value={datos.inspectorNombre || ""}
              disabled={true}
              readOnly
              style={{ width: "100%", background: "#eee" }}
            />
          </div>
        </div>

        {/* TEXTO DESLINDE RESPONSABILIDADES (el de tu captura) */}
        <p style={{ fontSize: 12, marginTop: 10, textAlign: "justify" }}>
          A los efectos de deslindar responsabilidades, el permisionario
          titular saliente tiene conocimiento de que quedan a su cargo las
          diferencias de novedades existentes entre las Actas de Recepción y
          Entrega de Vivienda Fiscal de la Armada, las que aparecieran al
          recibir el nuevo ocupante dentro de los cinco (5) días hábiles desde
          la entrega formal de la vivienda y todas aquellas que resulten como
          consecuencia de no haber dado cumplimiento al Reglamento de Viviendas
          Fiscales de la Armada.
          <br />
          <span style={smallHelp}>
            X Marcar con una equis la opción seleccionada que corresponda.
          </span>
        </p>
      </div>

      {/* 1. MATERIAL */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>1. Material</h4>
        <p style={smallHelp}>Seleccione SI / NO según corresponda.</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 120px",
            alignItems: "center",
            rowGap: 6,
          }}
        >
          {[
            [
              "Llaves de las puertas de entrada al edificio",
              "llavesEdificio",
            ],
            [
              "Llaves de las puertas de entrada a la vivienda",
              "llavesVivienda",
            ],
            ["Llaves de las puertas de entrada a la baulera", "llavesBaulera"],
            ["Llave de la puerta de acceso a la terraza", "llaveTerraza"],
            ["Llave de la puerta de acceso a la cochera", "llaveCochera"],
            [
              "Muebles, enseres y menaje según inventario",
              "inventarioMuebles",
            ],
            ["Línea telefónica funcionando", "lineaTelefonica"],
          ].map(([label, key]) => {
            const k = key as keyof NonNullable<Anexo03Datos["material"]>;
            const val = up<SiNo>(material[k]) as SiNo;
            return (
              <React.Fragment key={key}>
                <div>{label}</div>
                <select
                  value={val}
                  disabled={disabled}
                  onChange={(e) =>
                    setMaterialField(
                      k,
                      up<SiNo>(e.target.value as SiNo) as SiNo
                    )
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">(Seleccionar)</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. DOCUMENTACIÓN */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>2. Documentación</h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 120px",
            alignItems: "center",
            rowGap: 6,
          }}
        >
          {[
            [
              "Copia del Reglamento de Viviendas Fiscales de la Armada",
              "reglamentoViviendas",
            ],
            ["Guía telefónica", "guiaTelefonica"],
            [
              "Copia del Reglamento de Copropiedad del Edificio y/o Barrio",
              "reglamentoCopropiedad",
            ],
          ].map(([label, key]) => {
            const k = key as keyof NonNullable<
              Anexo03Datos["documentacion"]
            >;
            const val = up<SiNo>(doc[k]) as SiNo;
            return (
              <React.Fragment key={key}>
                <div>{label}</div>
                <select
                  value={val}
                  disabled={disabled}
                  onChange={(e) =>
                    setDocField(k, up<SiNo>(e.target.value as SiNo) as SiNo)
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">(Seleccionar)</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. LECTURA MEDIDOR */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>3. Lectura medidor</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <label>
            <span style={labelStyle}>Gas (m³)</span>
            <input
              type="text"
              value={med.gas_m3 || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("gas_m3", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={labelStyle}>Agua (m³)</span>
            <input
              type="text"
              value={med.agua_m3 || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("agua_m3", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={labelStyle}>Luz (Kws)</span>
            <input
              type="text"
              value={med.luz_kws || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("luz_kws", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <span style={labelStyle}>Teléfono (pulsos)</span>
            <input
              type="text"
              value={med.telefono_pulsos || ""}
              disabled={disabled}
              onChange={(e) =>
                setMedidorField("telefono_pulsos", e.target.value)
              }
              style={{ width: "100%" }}
            />
          </label>
        </div>
      </div>

      {/* ESTADO DE SISTEMAS Y ELEMENTOS – MB/B/R/M */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 4px 0" }}>Estado de sistemas y elementos</h4>
        <p style={smallHelp}>
          Circular lo que corresponda: MB (Muy Bueno) – B (Bueno) – R (Regular)
          – M (Malo).
        </p>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: 4,
                  textAlign: "left",
                }}
              >
                Elemento
              </th>
              <th style={{ border: "1px solid #ccc", padding: 4 }}>MB</th>
              <th style={{ border: "1px solid #ccc", padding: 4 }}>B</th>
              <th style={{ border: "1px solid #ccc", padding: 4 }}>R</th>
              <th style={{ border: "1px solid #ccc", padding: 4 }}>M</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Agua", "agua"],
              ["Cloacas", "cloacas"],
              ["Electricidad", "electricidad"],
              ["Gas", "gas"],
              ["Pluviales", "pluviales"],
              ["Teléfono", "telefono"],
              ["Aberturas", "aberturas"],
              ["Albañilería", "albanileria"],
              ["Alfombras", "alfombras"],
              ["Antena TV", "antenaTv"],
              ["Calefactor / Estufa", "calefactorEstufa"],
              ["Calefón / Termotanque", "calefonTermotanque"],
              ["Carpintería", "carpinteria"],
              ["Cerrajería", "cerrajeria"],
              ["Cocina", "cocina"],
              ["Desinfección", "desinfeccion"],
              ["Herrajes", "herrajes"],
              ["Limpieza", "limpieza"],
              ["Lustrado", "lustrado"],
              ["Parques y Jardines", "parquesJardines"],
              ["Pintura", "pintura"],
              ["Pisos", "pisos"],
              ["Portero Eléctrico", "porteroElectrico"],
              ["Sanitarios", "sanitarios"],
              ["Vidrios", "vidrios"],
              ["Estado General", "estadoGeneral"],
            ].map(([label, key]) => {
              const k = key as keyof NonNullable<
                Anexo03Datos["estadoSistemas"]
              >;
              const current = up<EstadoMBR>(est[k]) as EstadoMBR;

              return (
                <tr key={key}>
                  <td style={{ border: "1px solid #ccc", padding: 4 }}>
                    {label}
                  </td>
                  {["MB", "B", "R", "M"].map((opt) => (
                    <td
                      key={opt}
                      style={{
                        border: "1px solid #ccc",
                        padding: 4,
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name={`est09-${key}`}
                        disabled={disabled}
                        checked={current === (opt as EstadoMBR)}
                        onChange={() => setEstadoField(k, opt as EstadoMBR)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* NOVEDADES – lista dinámica para el inspector */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>Novedades / observaciones</h4>
        <p style={smallHelp}>
          Podés detallar cada novedad como un ítem separado. Se volcarán en el
          acta como texto corrido.
        </p>

        {!disabled && (
          <button
            type="button"
            onClick={() => updateNovedades([...novedadesItems, ""])}
            style={{
              marginBottom: 8,
              fontSize: 11,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            + Agregar ítem
          </button>
        )}

        <div style={{ display: "grid", gap: 6 }}>
          {novedadesItems.map((txt, idx) => (
            <div
              key={idx}
              style={{ display: "flex", gap: 6, alignItems: "flex-start" }}
            >
              <textarea
                value={txt}
                disabled={disabled}
                onChange={(e) => {
                  const copy = [...novedadesItems];
                  copy[idx] = e.target.value;
                  updateNovedades(copy);
                }}
                rows={2}
                style={{ flex: 1, resize: "vertical" }}
                placeholder={`Novedad ${idx + 1}`}
              />
              {!disabled && novedadesItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const copy = [...novedadesItems];
                    copy.splice(idx, 1);
                    if (copy.length === 0) copy.push("");
                    updateNovedades(copy);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "4px 6px",
                    cursor: "pointer",
                  }}
                >
                  X
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
