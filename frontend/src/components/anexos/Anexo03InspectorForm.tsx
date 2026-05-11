// frontend/src/components/anexos/Anexo03InspectorForm.tsx

import React, { useMemo } from "react";

type SiNo = "SI" | "NO" | "";
type EstadoMBR = "" | "MB" | "B" | "R" | "M";

export interface Anexo03Datos {
  permisionarioNombre?: string;
  unidadHabitacional?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  inspectorNombre?: string;

  // Solo ANEXO 09 (pero no rompe en ANEXO 03)
  proximoDestinoPermisionario?: string;
  telefonoPermisionario?: string;

  material?: {
    llavesEdificio?: SiNo;
    llavesVivienda?: SiNo;
    llavesBaulera?: SiNo;
    llaveTerraza?: SiNo;
    llaveCochera?: SiNo;
    inventarioMuebles?: SiNo;
    lineaTelefonica?: SiNo;
  };

  documentacion?: {
    reglamentoViviendas?: SiNo;
    guiaTelefonica?: SiNo;
    reglamentoCopropiedad?: SiNo;
  };

  medidores?: {
    gas_m3?: string;
    agua_m3?: string;
    luz_kws?: string;
    telefono_pulsos?: string;
  };

  estadoSistemas?: {
    agua?: EstadoMBR;
    cloacas?: EstadoMBR;
    electricidad?: EstadoMBR;
    gas?: EstadoMBR;
    pluviales?: EstadoMBR;
    telefono?: EstadoMBR;
    aberturas?: EstadoMBR;
    albanileria?: EstadoMBR;
    alfombras?: EstadoMBR;
    antenaTv?: EstadoMBR;
    calefactorEstufa?: EstadoMBR;
    calefonTermotanque?: EstadoMBR;
    carpinteria?: EstadoMBR;
    cerrajeria?: EstadoMBR;
    cocina?: EstadoMBR;
    desinfeccion?: EstadoMBR;
    herrajes?: EstadoMBR;
    limpieza?: EstadoMBR;
    lustrado?: EstadoMBR;
    parquesJardines?: EstadoMBR;
    pintura?: EstadoMBR;
    pisos?: EstadoMBR;
    porteroElectrico?: EstadoMBR;
    sanitarios?: EstadoMBR;
    vidrios?: EstadoMBR;
    estadoGeneral?: EstadoMBR;
  };

  // Texto plano que usa el backend/PDF
  novedadesTexto?: string;

  // Lista de novedades para UI (se sincroniza con novedadesTexto)
  novedadesLista?: string[];

  lugarFirma?: string;
  fechaFirma?: string; // yyyy-mm-dd
}

interface Props {
  value: Anexo03Datos;
  onChange: (next: Anexo03Datos) => void;
  readOnly?: boolean;

  // Para poder reutilizar el mismo form en ANEXO_03 y ANEXO_09
  anexoCodigo?: "03" | "09";
  tipoActa?: "RECEPCIÓN" | "ENTREGA";

  // ✅ NUEVO (opcional): Acción "Enviar" (el parent hace el request real)
  onEnviar?: (payload: Anexo03Datos) => void | Promise<void>;
  enviando?: boolean;
  enviarLabel?: string;

  // ✅ NUEVO (opcional): control de habilitación del botón
  canEnviar?: boolean;
  validarAntesDeEnviar?: boolean; // default true
}

function up<T extends string>(v: T | undefined | null): T | "" {
  return (v || "").toUpperCase().trim() as T | "";
}

function Anexo03InspectorForm({
  value,
  onChange,
  readOnly,
  anexoCodigo = "03",
  tipoActa = "RECEPCIÓN",

  onEnviar,
  enviando = false,
  enviarLabel,
  canEnviar,
  validarAntesDeEnviar = true,
}: Props) {
  const datos = value || {};

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

  // --- Novedades: lista dinámica + sincronización con texto plano ---
  function getNovedadesLista(): string[] {
    if (Array.isArray(datos.novedadesLista) && datos.novedadesLista.length) {
      return datos.novedadesLista;
    }
    if (datos.novedadesTexto) {
      const parts = String(datos.novedadesTexto)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : [""];
    }
    return [""];
  }

  function updateNovedadesLista(nextList: string[]) {
    const cleanList = nextList.length ? nextList : [""];
    const texto = cleanList
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");

    onChange({
      ...datos,
      novedadesLista: cleanList,
      novedadesTexto: texto,
    });
  }

  function setNovedadItem(index: number, text: string) {
    const list = [...getNovedadesLista()];
    list[index] = text;
    updateNovedadesLista(list);
  }

  function addNovedad() {
    const list = [...getNovedadesLista(), ""];
    updateNovedadesLista(list);
  }

  function removeNovedad(index: number) {
    const list = getNovedadesLista().filter((_, i) => i !== index);
    updateNovedadesLista(list);
  }

  const novedadesLista = getNovedadesLista();

  const material = datos.material || {};
  const doc = datos.documentacion || {};
  const med = datos.medidores || {};
  const est = datos.estadoSistemas || {};

  const disabled = !!readOnly;
  const esAnexo03 = anexoCodigo === "03";

  const blockStyle: React.CSSProperties = {
    border: esAnexo03 ? "1px solid rgba(255,255,255,0.12)" : "1px solid #ddd",
    borderRadius: esAnexo03 ? 16 : 10,
    padding: esAnexo03 ? 16 : 12,
    marginBottom: 14,
    background: esAnexo03 ? "rgba(255,255,255,0.05)" : "#fafafa",
    color: esAnexo03 ? "#ffffff" : undefined,
    boxShadow: esAnexo03 ? "0 10px 30px rgba(0,0,0,0.18)" : undefined,
    minWidth: 0,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: esAnexo03 ? 800 : 600,
    fontSize: esAnexo03 ? 11 : 13,
    display: "block",
    marginBottom: esAnexo03 ? 6 : 4,
    textTransform: esAnexo03 ? "uppercase" : undefined,
    letterSpacing: esAnexo03 ? "0.08em" : undefined,
    color: esAnexo03 ? "rgba(255,255,255,0.62)" : undefined,
  };

  const smallHelp: React.CSSProperties = {
    fontSize: 11,
    opacity: esAnexo03 ? 1 : 0.7,
    color: esAnexo03 ? "rgba(255,255,255,0.62)" : undefined,
    lineHeight: 1.5,
  };

  const rootStyle: React.CSSProperties = {
    display: "grid",
    gap: esAnexo03 ? 14 : 12,
    color: esAnexo03 ? "rgba(255,255,255,0.90)" : undefined,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: esAnexo03 ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr 1fr",
    gap: esAnexo03 ? 12 : 8,
    minWidth: 0,
  };

  const twoColumnGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: esAnexo03 ? "repeat(auto-fit, minmax(220px, 1fr))" : "2fr 1fr",
    gap: esAnexo03 ? 12 : 8,
    alignItems: "center",
    minWidth: 0,
  };

  const optionGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: esAnexo03 ? "minmax(0, 1fr) minmax(130px, 180px)" : "2fr 120px",
    alignItems: "center",
    gap: esAnexo03 ? 10 : undefined,
    rowGap: esAnexo03 ? 10 : 6,
    minWidth: 0,
  };

  const medidoresGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: esAnexo03 ? "repeat(auto-fit, minmax(160px, 1fr))" : "repeat(4, minmax(0, 1fr))",
    gap: esAnexo03 ? 12 : 8,
    minWidth: 0,
  };

  const wideFieldStyle: React.CSSProperties = {
    gridColumn: esAnexo03 ? "1 / -1" : "1 / span 2",
  };

  const controlStyle: React.CSSProperties = esAnexo03
    ? {
        width: "100%",
        minHeight: 42,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: "#ffffff",
        boxSizing: "border-box",
        outline: "none",
      }
    : { width: "100%" };

  const readOnlyControlStyle: React.CSSProperties = esAnexo03
    ? {
        ...controlStyle,
        background: "rgba(255,255,255,0.025)",
        color: "rgba(255,255,255,0.72)",
        cursor: "not-allowed",
      }
    : { width: "100%", background: "#eee" };

  const selectStyle: React.CSSProperties = esAnexo03
    ? {
        ...controlStyle,
        colorScheme: "dark",
      }
    : { width: "100%" };

  const optionStyle: React.CSSProperties | undefined = esAnexo03
    ? { backgroundColor: "#111827", color: "#ffffff" }
    : undefined;

  const textareaStyle: React.CSSProperties = esAnexo03
    ? { ...controlStyle, resize: "vertical", lineHeight: 1.5 }
    : { width: "100%", resize: "vertical" };

  const tableWrapStyle: React.CSSProperties = esAnexo03
    ? {
        overflowX: "auto",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
      }
    : {};

  const tableStyle: React.CSSProperties = {
    width: "100%",
    minWidth: esAnexo03 ? 520 : undefined,
    borderCollapse: "collapse",
    fontSize: 12,
  };

  const thStyle: React.CSSProperties = {
    border: esAnexo03 ? "1px solid rgba(255,255,255,0.12)" : "1px solid #ccc",
    padding: esAnexo03 ? 8 : 4,
    color: esAnexo03 ? "rgba(255,255,255,0.76)" : undefined,
    background: esAnexo03 ? "rgba(255,255,255,0.04)" : undefined,
  };

  const tdStyle: React.CSSProperties = {
    border: esAnexo03 ? "1px solid rgba(255,255,255,0.10)" : "1px solid #ccc",
    padding: esAnexo03 ? 8 : 4,
    color: esAnexo03 ? "rgba(255,255,255,0.88)" : undefined,
  };

  const secondaryButtonStyle: React.CSSProperties = esAnexo03
    ? {
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.04)",
        color: "#ffffff",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }
    : { fontSize: 12, marginTop: 4 };

  const dangerButtonStyle: React.CSSProperties = esAnexo03
    ? {
        ...secondaryButtonStyle,
        alignSelf: "flex-start",
        border: "1px solid rgba(239,68,68,0.32)",
        color: "#fecaca",
      }
    : { alignSelf: "flex-start", padding: "4px 8px", fontSize: 11 };

  const actionBarStyle: React.CSSProperties = esAnexo03
    ? {
        position: "sticky",
        bottom: 0,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 14,
        background: "rgba(15,23,42,0.96)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }
    : {
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
      };

  const primaryButtonStyle: React.CSSProperties = esAnexo03
    ? {
        padding: "10px 14px",
        borderRadius: 10,
        border: "none",
        background: "#16a34a",
        color: "#ffffff",
        fontWeight: 800,
        cursor: "pointer",
      }
    : { fontWeight: 700, padding: "8px 12px" };

  const tituloActa =
    tipoActa === "ENTREGA"
      ? "ACTA DE ENTREGA DE VIVIENDA FISCAL DE LA ARMADA"
      : "ACTA DE RECEPCIÓN DE VIVIENDA FISCAL DE LA ARMADA";

  const esAnexo09 = anexoCodigo === "09";

  // ✅ Validación mínima (no bloquea si validarAntesDeEnviar=false)
  const canEnviarComputed = useMemo(() => {
    if (typeof canEnviar === "boolean") return canEnviar;
    if (!validarAntesDeEnviar) return true;

    const p = String(datos.permisionarioNombre || "").trim();
    const u = String(datos.unidadHabitacional || "").trim();
    const i = String(datos.inspectorNombre || "").trim();

    // Recomendado: exigir lugar y fecha de firma para que “enviar” tenga sentido institucional
    const lugar = String(datos.lugarFirma || "").trim();
    const fecha = String(datos.fechaFirma || "").trim();

    // unidadHabitacional suele venir bloqueada y puede estar vacía si el parent no hidrató.
    // Entonces no la exigimos estrictamente.
    return !!p && !!i && !!lugar && !!fecha && (u.length >= 0);
  }, [canEnviar, validarAntesDeEnviar, datos]);

  const textoEnviarDefault =
    enviarLabel ||
    (esAnexo09 ? "Enviar ACTA (ANEXO 09)" : "Enviar ACTA (ANEXO 03)");

  async function handleEnviar() {
    if (!onEnviar) return;
    if (disabled) return;
    if (!canEnviarComputed) return;

    // Le damos al parent exactamente el payload actual del form.
    await onEnviar({ ...datos });
  }

  return (
    <div style={rootStyle}>
      {/* ENCABEZADO – datos generales */}
      <div style={blockStyle}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12 }}>R.G-6-002 PÚBLICO</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            ANEXO {anexoCodigo}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{tituloActa}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {esAnexo09
              ? "(3.07., incs. 2., 3. y 5.; 5.09., inc. 2. y 5.16., inc. 3.)"
              : "(2.11., inc. 1.; 2.14., inc. 3.; 2.19., subinc. 6.1.; 3.01., inc. 3.; 3.08., subinc. 2.4.; 3.09., inc. 5.; 4.05., inc. 2. y 5.09., inc. 1.)"}
          </div>
        </div>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Permisionario</label>
            <input
              type="text"
              value={datos.permisionarioNombre || ""}
              disabled={disabled}
              onChange={(e) => setField("permisionarioNombre", e.target.value)}
              style={controlStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Unidad habitacional</label>
            <input
              type="text"
              value={datos.unidadHabitacional || ""}
              disabled={true}
              readOnly
              style={readOnlyControlStyle}
            />
          </div>

          <div style={wideFieldStyle}>
            <label style={labelStyle}>Dirección unidad habitacional</label>
            <input
              type="text"
              value={datos.direccion || ""}
              disabled={disabled}
              onChange={(e) => setField("direccion", e.target.value)}
              style={controlStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Localidad</label>
            <input
              type="text"
              value={datos.localidad || ""}
              disabled={disabled}
              onChange={(e) => setField("localidad", e.target.value)}
              style={controlStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Provincia</label>
            <input
              type="text"
              value={datos.provincia || ""}
              disabled={disabled}
              onChange={(e) => setField("provincia", e.target.value)}
              style={controlStyle}
            />
          </div>

          <div style={wideFieldStyle}>
            <label style={labelStyle}>Inspector</label>
            <input
              type="text"
              value={datos.inspectorNombre || ""}
              disabled={true}
              readOnly
              style={readOnlyControlStyle}
            />
          </div>
        </div>

        {/* Texto institucional según anexo */}
        {esAnexo09 ? (
          <>
            <p style={{ fontSize: 12, marginTop: 10, textAlign: "justify" }}>
              A los efectos de deslindar responsabilidades, el permisionario
              titular saliente tiene conocimiento de que quedan a su cargo las
              diferencias de novedades existentes entre las Actas de Recepción y
              Entrega de Vivienda Fiscal de la Armada, las que aparecieran al
              recibir el nuevo ocupante dentro de los cinco (5) días hábiles a
              contabilizarlos desde la entrega formal de la vivienda y todas
              aquellas que resulten como consecuencia de no haber dado
              cumplimiento a lo establecido en el Reglamento de Viviendas
              Fiscales de la Armada.
            </p>

            <div style={{ marginTop: 8, fontSize: 12 }}>
              <span>
                A los fines de la formulación de los cargos que correspondieran,
                el próximo destino del permisionario será:
              </span>
              <input
                type="text"
                disabled={disabled}
                value={datos.proximoDestinoPermisionario || ""}
                onChange={(e) =>
                  setField("proximoDestinoPermisionario", e.target.value)
                }
                style={{
                  ...controlStyle,
                  marginTop: 4,
                  marginBottom: 4,
                }}
              />
              <span>cuyo teléfono es:</span>
              <input
                type="text"
                disabled={disabled}
                value={datos.telefonoPermisionario || ""}
                onChange={(e) =>
                  setField("telefonoPermisionario", e.target.value)
                }
                style={{
                  ...controlStyle,
                  marginTop: 4,
                }}
              />
            </div>

            <p style={{ fontSize: 12, marginTop: 10, textAlign: "justify" }}>
              El permisionario entrega la unidad habitacional al Inspector
              designado por el Organismo Administrador de la zona naval, de
              acuerdo al Inventario General de la vivienda, al material, la
              documentación y las novedades que se detallan en la presente Acta
              de Entrega de Vivienda Fiscal de la Armada.{" "}
              <span style={smallHelp}>
                X Marcar con una equis la opción seleccionada que corresponda.
              </span>
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12, marginTop: 10, textAlign: "justify" }}>
            El permisionario titular{" "}
            {tipoActa === "ENTREGA"
              ? "devuelve a la Armada la Unidad Habitacional indicada precedentemente, por intermedio del Inspector designado por el Organismo Administrador de la zona naval."
              : "recibe de la Dirección General del Personal Naval la Unidad Habitacional indicada precedentemente, por intermedio del Inspector designado por el Organismo Administrador de la zona naval."}{" "}
            La {tipoActa === "ENTREGA" ? "entrega" : "recepción"} se realiza de
            acuerdo al Inventario General de la Vivienda, al material, la
            documentación y las novedades que se detallan en la presente Acta de{" "}
            {tipoActa === "ENTREGA" ? "Entrega" : "Recepción"}.{" "}
            <span style={smallHelp}>
              X Marcar con una equis la opción seleccionada que corresponda.
            </span>
          </p>
        )}
      </div>

      {/* 1. MATERIAL */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>1. Material</h4>
        <p style={smallHelp}>Seleccione SI / NO según corresponda.</p>

        <div style={optionGridStyle}>
          {[
            ["Llaves de las puertas de entrada al edificio", "llavesEdificio"],
            ["Llaves de las puertas de entrada a la vivienda", "llavesVivienda"],
            ["Llaves de las puertas de entrada a la baulera", "llavesBaulera"],
            ["Llave de la puerta de acceso a la terraza", "llaveTerraza"],
            ["Llave de la puerta de acceso a la cochera", "llaveCochera"],
            ["Muebles, enseres y menaje según inventario", "inventarioMuebles"],
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
                  style={selectStyle}
                >
                  <option value="" style={optionStyle}>(Seleccionar)</option>
                  <option value="SI" style={optionStyle}>SI</option>
                  <option value="NO" style={optionStyle}>NO</option>
                </select>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. DOCUMENTACIÓN */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>2. Documentación</h4>

        <div style={optionGridStyle}>
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
            const k = key as keyof NonNullable<Anexo03Datos["documentacion"]>;
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
                  style={selectStyle}
                >
                  <option value="" style={optionStyle}>(Seleccionar)</option>
                  <option value="SI" style={optionStyle}>SI</option>
                  <option value="NO" style={optionStyle}>NO</option>
                </select>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. LECTURA MEDIDOR */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>3. Lectura medidor</h4>
        <div style={medidoresGridStyle}>
          <label>
            <span style={labelStyle}>Gas (m³)</span>
            <input
              type="text"
              value={med.gas_m3 || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("gas_m3", e.target.value)}
              style={controlStyle}
            />
          </label>
          <label>
            <span style={labelStyle}>Agua (m³)</span>
            <input
              type="text"
              value={med.agua_m3 || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("agua_m3", e.target.value)}
              style={controlStyle}
            />
          </label>
          <label>
            <span style={labelStyle}>Luz (Kws)</span>
            <input
              type="text"
              value={med.luz_kws || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("luz_kws", e.target.value)}
              style={controlStyle}
            />
          </label>
          <label>
            <span style={labelStyle}>Teléfono (pulsos)</span>
            <input
              type="text"
              value={med.telefono_pulsos || ""}
              disabled={disabled}
              onChange={(e) => setMedidorField("telefono_pulsos", e.target.value)}
              style={controlStyle}
            />
          </label>
        </div>
      </div>

      {/* ESTADO DE SISTEMAS Y ELEMENTOS */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 4px 0" }}>Estado de sistemas y elementos</h4>
        <p style={smallHelp}>
          Circular lo que corresponda: MB (Muy Bueno) – B (Bueno) – R (Regular) – M (Malo).
        </p>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}>
                  Elemento
                </th>
                <th style={thStyle}>MB</th>
                <th style={thStyle}>B</th>
                <th style={thStyle}>R</th>
                <th style={thStyle}>M</th>
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
              const k = key as keyof NonNullable<Anexo03Datos["estadoSistemas"]>;
              const current = up<EstadoMBR>(est[k]) as EstadoMBR;

              return (
                <tr key={key}>
                  <td style={tdStyle}>{label}</td>
                  {["MB", "B", "R", "M"].map((opt) => (
                    <td
                      key={opt}
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name={`est-${key}`}
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
      </div>

      {/* NOVEDADES – lista dinámica */}
      <div style={blockStyle}>
        <h4 style={{ margin: "0 0 6px 0" }}>Novedades</h4>
        <p style={smallHelp}>
          Registre cada novedad por separado. Se enviarán al backend como un texto único (una línea por novedad).
        </p>

        {novedadesLista.map((nov, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: esAnexo03 ? "wrap" : undefined }}>
            <textarea
              value={nov}
              disabled={disabled}
              onChange={(e) => setNovedadItem(idx, e.target.value)}
              rows={3}
              style={textareaStyle}
              placeholder={`Novedad ${idx + 1}`}
            />
            {!disabled && novedadesLista.length > 1 && (
              <button
                type="button"
                onClick={() => removeNovedad(idx)}
                style={dangerButtonStyle}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <button type="button" onClick={addNovedad} style={secondaryButtonStyle}>
            + Agregar novedad
          </button>
        )}
      </div>

      {/* CLAUSULA + LUGAR / FECHA */}
      <div style={blockStyle}>
        <p style={{ fontSize: 11, textAlign: "justify", marginBottom: 10 }}>
          Finalizado el tiempo de ocupación de la unidad habitacional que la Armada ha asignado formalmente con la firma
          de la presente Acta de {tipoActa === "ENTREGA" ? "Entrega" : "Recepción"} de Vivienda Fiscal, en el caso de no
          dar cumplimiento a lo establecido en la Publicación R.G-6-002 “P” (Reglamento de Viviendas Fiscales de la
          Armada), autorizo a la Armada Argentina a ejercer su legítimo derecho para descontar del haber mensual la suma
          necesaria para restituir la vivienda a las condiciones reglamentarias.
        </p>

        <div style={twoColumnGridStyle}>
          <div>
            <label style={labelStyle}>Lugar</label>
            <input
              type="text"
              value={datos.lugarFirma || ""}
              disabled={disabled}
              onChange={(e) => setField("lugarFirma", e.target.value)}
              style={controlStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              value={datos.fechaFirma || ""}
              disabled={disabled}
              onChange={(e) => setField("fechaFirma", e.target.value)}
              style={controlStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: esAnexo03 ? "repeat(auto-fit, minmax(180px, 1fr))" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginTop: 16,
            fontSize: 11,
            textAlign: "center",
            color: esAnexo03 ? "rgba(255,255,255,0.72)" : undefined,
          }}
        >
          <div>
            ________________________________
            <br />
            Permisionario o Representante
          </div>
          <div>
            ________________________________
            <br />
            Inspector
          </div>
          <div>
            ________________________________
            <br />
            Jefe Organismo Administrador
          </div>
        </div>
      </div>

      {/* ✅ ACCIONES (opcional): Enviar */}
      {onEnviar && !disabled && (
        <div
          style={actionBarStyle}
        >
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {!canEnviarComputed && validarAntesDeEnviar ? (
              <span>
                Completá al menos: <b>Permisionario</b>, <b>Lugar</b> y <b>Fecha</b> para poder enviar.
              </span>
            ) : (
              <span>Listo para enviar.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando || !canEnviarComputed}
            style={primaryButtonStyle}
            title={
              !canEnviarComputed && validarAntesDeEnviar
                ? "Faltan datos mínimos para enviar"
                : "Enviar al flujo institucional"
            }
          >
            {enviando ? "Enviando…" : textoEnviarDefault}
          </button>
        </div>
      )}
    </div>
  );
}

export default Anexo03InspectorForm;
