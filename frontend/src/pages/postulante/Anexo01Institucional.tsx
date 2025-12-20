import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

type YesNo = "SI" | "NO" | "";

type Conviviente = {
  apellidoNombres: string;
  relacion: string;
  aCargo: "SI" | "NO" | "";
  edad: string;
  dni: string;
  diba: string;
};

type Mascota = {
  especie: string;
  raza: string;
  edad: string;
  sexo: string;
  peso: string;
  certificadoFile?: File | null; // soporte de certificados de vacunación (pto 9) u otro
};

type Propiedad = {
  direccion: string;
  observaciones: string;
};

type Representante = {
  apellidoNombres: string;
  grado: string;
  mr: string;
  destino: string;
  telefono: string;
};

function Box({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #222", padding: 14, marginBottom: 12 }}>
      {title && (
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Row({
  label,
  children,
  requiredMark,
}: {
  label: string;
  children: React.ReactNode;
  requiredMark?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
        {label} {requiredMark ? "*" : ""}
      </div>
      {children}
    </div>
  );
}

function YesNoControl({
  value,
  onChange,
}: {
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input
          type="radio"
          checked={value === "SI"}
          onChange={() => onChange("SI")}
        />
        SI
      </label>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input
          type="radio"
          checked={value === "NO"}
          onChange={() => onChange("NO")}
        />
        NO
      </label>
    </div>
  );
}

export default function Anexo01Institucional() {
  const navigate = useNavigate();

  // Encabezado (Lugar y fecha / AL SEÑOR)
  const [lugarYFecha, setLugarYFecha] = useState("");
  const [alSenor, setAlSenor] = useState("");

  // Opciones de inscripción (marcar con X una)
  const [tipoSolicitud, setTipoSolicitud] = useState<
    "INSCRIPCION" | "CAMBIO_VIVIENDA" | ""
  >("");

  // Punto 1 (conozco y acepto reglamento)
  const [aceptaReglamento, setAceptaReglamento] = useState(false);

  // Punto 2 (datos personales)
  const [mr, setMr] = useState("");
  const [afiliadoDiba, setAfiliadoDiba] = useState("");
  const [gradoEscalafon, setGradoEscalafon] = useState("");
  const [apellido, setApellido] = useState("");
  const [nombres, setNombres] = useState("");
  const [destinoActual, setDestinoActual] = useState("");
  const [destinoFuturo, setDestinoFuturo] = useState("");
  const [telefonoActual, setTelefonoActual] = useState("");
  const [telefonoFuturo, setTelefonoFuturo] = useState("");

  // Punto 3
  const [fechaUltimoAscenso, setFechaUltimoAscenso] = useState("");
  const [aniosServicioRecibo, setAniosServicioRecibo] = useState("");

  // Punto 4 (FIDOFAC)
  const [agregaFidofac, setAgregaFidofac] = useState<YesNo>("");
  const [fidofacFile, setFidofacFile] = useState<File | null>(null);

  // Punto 5 (convivientes)
  const [convivientes, setConvivientes] = useState<Conviviente[]>([]);
  function addConviviente() {
    setConvivientes((p) => [
      ...p,
      {
        apellidoNombres: "",
        relacion: "",
        aCargo: "",
        edad: "",
        dni: "",
        diba: "",
      },
    ]);
  }
  function removeConviviente(idx: number) {
    setConvivientes((p) => p.filter((_, i) => i !== idx));
  }
  function updateConviviente(idx: number, patch: Partial<Conviviente>) {
    setConvivientes((p) =>
      p.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  }

  // Punto 6 (mascotas) — en PDF es texto, pero lo hacemos planilla dinámica
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  function addMascota() {
    setMascotas((p) => [
      ...p,
      { especie: "", raza: "", edad: "", sexo: "", peso: "", certificadoFile: null },
    ]);
  }
  function removeMascota(idx: number) {
    setMascotas((p) => p.filter((_, i) => i !== idx));
  }
  function updateMascota(idx: number, patch: Partial<Mascota>) {
    setMascotas((p) =>
      p.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    );
  }

  // Punto 7 (propiedades)
  const [tienePropiedadesZona, setTienePropiedadesZona] = useState<YesNo>("");
  const [prop1, setProp1] = useState<Propiedad>({
    direccion: "",
    observaciones: "",
  });
  const [prop2, setProp2] = useState<Propiedad>({
    direccion: "",
    observaciones: "",
  });
  const [prop3, setProp3] = useState<Propiedad>({
    direccion: "",
    observaciones: "",
  });
  const [verificoArticulo506, setVerificoArticulo506] = useState<YesNo>("");

  // Punto 8 (problemas socioeconómicos)
  const [tieneProblemasSocio, setTieneProblemasSocio] = useState<YesNo>("");
  const [oficioSocio, setOficioSocio] = useState("");

  // Punto 9 (certificados vacunación)
  const [agregaCertVacunacion, setAgregaCertVacunacion] = useState<YesNo>("");

  // Punto 10 (inepto)
  const [ineptoDGPN, setIneptoDGPN] = useState<YesNo>("");

  // Punto 11 (recibo haberes)
  const [agregaReciboHaberes, setAgregaReciboHaberes] = useState<YesNo>("");
  const [reciboHaberesFile, setReciboHaberesFile] = useState<File | null>(null);

  // Punto 12 (años ocupación previa)
  const [aniosOcupacionPrevia, setAniosOcupacionPrevia] = useState("");

  // Punto 13 (representantes)
  const [rep1, setRep1] = useState<Representante>({
    apellidoNombres: "",
    grado: "",
    mr: "",
    destino: "",
    telefono: "",
  });
  const [rep2, setRep2] = useState<Representante>({
    apellidoNombres: "",
    grado: "",
    mr: "",
    destino: "",
    telefono: "",
  });

  // Punto 14–15 (autorizaciones)
  const [autorizaDescuentos, setAutorizaDescuentos] = useState(false);
  const [autorizaAdministradorExpensas, setAutorizaAdministradorExpensas] =
    useState(false);

  // Punto 16 (fecha estimada traslado)
  const [fechaEstimadaTraslado, setFechaEstimadaTraslado] = useState("");

  // Agregados resumen
  const agregadoFidofac = agregaFidofac;
  const agregadoVacunacion = agregaCertVacunacion;
  const agregadoEscrituras = tienePropiedadesZona;
  const agregadoRecibo = agregaReciboHaberes;

  // Archivo extra (escrituras/contratos)
  const [escriturasYContratosFile, setEscriturasYContratosFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const errorGenerico = () =>
    setErr("No se ha podido procesar su solicitud, contacte al administrador.");

  const small = useMemo(
    () => ({ fontSize: 12, lineHeight: 1.35, opacity: 0.9 }),
    []
  );

  function validarMinimo(): boolean {
    if (!tipoSolicitud) return false;
    if (!aceptaReglamento) return false;

    if (!apellido.trim() || !nombres.trim()) return false;
    if (!mr.trim()) return false;

    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setErr(null);

    if (!validarMinimo()) {
      errorGenerico();
      return;
    }

    const datos = {
      // Cabecera
      lugarYFecha: lugarYFecha || null,
      alSenor: alSenor || null,
      tipoSolicitud,

      // Punto 1
      aceptaReglamento,

      // Punto 2
      mr,
      afiliadoDiba,
      gradoEscalafon,
      apellido,
      nombres,
      destinoActual,
      destinoFuturo,
      telefonoActual,
      telefonoFuturo,

      // Punto 3
      fechaUltimoAscenso,
      aniosServicioRecibo,

      // Punto 4
      agregaFidofac,

      // Punto 5
      convivientes,

      // Punto 6
      mascotas: mascotas.map((m) => ({
        especie: m.especie,
        raza: m.raza,
        edad: m.edad,
        sexo: m.sexo,
        peso: m.peso,
      })),

      // Punto 7
      tienePropiedadesZona,
      propiedades: [prop1, prop2, prop3],
      verificoArticulo506,

      // Punto 8
      tieneProblemasSocio,
      oficioSocio,

      // Punto 9
      agregaCertVacunacion,

      // Punto 10
      ineptoDGPN,

      // Punto 11
      agregaReciboHaberes,

      // Punto 12
      aniosOcupacionPrevia,

      // Punto 13
      representantes: [rep1, rep2],

      // Punto 14–15
      autorizaDescuentos,
      autorizaAdministradorExpensas,

      // Punto 16
      fechaEstimadaTraslado,

      // Agregados resumen
      agregados: {
        fidofac: agregadoFidofac,
        vacunacion: agregadoVacunacion,
        escriturasYContratos: agregadoEscrituras,
        reciboHaberes: agregadoRecibo,
      },
    };

    const fd = new FormData();
    fd.append("datos", JSON.stringify(datos));

    if (fidofacFile) fd.append("adj_fidofac", fidofacFile);
    if (reciboHaberesFile) fd.append("adj_recibo_haberes", reciboHaberesFile);
    if (escriturasYContratosFile) fd.append("adj_escrituras_contratos", escriturasYContratosFile);

    // Certificados por mascota (si adjuntan)
    mascotas.forEach((m, idx) => {
      if (m.certificadoFile) fd.append(`mascota_cert_${idx}`, m.certificadoFile);
    });

    try {
      setLoading(true);
      const resp = await http.post("/formularios/ANEXO_01", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setOk(resp.data?.message || "Formulario enviado.");
      navigate("/app/postulante", { replace: true });
    } catch {
      errorGenerico();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1020, margin: "0 auto", padding: 24 }}>
      <div style={{ border: "2px solid #222", padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>ARMADA ARGENTINA</div>
          <div style={{ fontWeight: 700 }}>R.G-6-002 — PÚBLICO</div>
        </div>
        <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>
          ANEXO 01 — FORMULARIO DE INSCRIPCIÓN PARA OCUPAR VIVIENDA FISCAL
        </div>
        <div style={small}>DECLARACIÓN JURADA DE POSTULACIÓN</div>
      </div>

      {err && (
        <div
          style={{
            border: "1px solid #c00",
            padding: 12,
            marginBottom: 12,
            color: "#c00",
          }}
        >
          {err}
        </div>
      )}
      {ok && (
        <div
          style={{
            border: "1px solid #0a0",
            padding: 12,
            marginBottom: 12,
            color: "#0a0",
          }}
        >
          {ok}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <Box>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Row label="Lugar y fecha:" requiredMark>
              <input
                value={lugarYFecha}
                onChange={(e) => setLugarYFecha(e.target.value)}
                placeholder="Ej: Puerto Belgrano, 19/12/2025"
                style={{ width: "100%" }}
              />
            </Row>

            <Row label="AL SEÑOR:" requiredMark>
              <input
                value={alSenor}
                onChange={(e) => setAlSenor(e.target.value)}
                placeholder="Ej: Jefe de la Oficina de Viviendas — Zona Naval"
                style={{ width: "100%" }}
              />
            </Row>
          </div>

          <div style={{ marginTop: 6, ...small }}>
            Marcar con una equis la opción seleccionada que corresponda.
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid #222",
                padding: 10,
              }}
            >
              <input
                type="radio"
                checked={tipoSolicitud === "INSCRIPCION"}
                onChange={() => setTipoSolicitud("INSCRIPCION")}
              />
              Solicito mi inscripción como postulante para acceder a la ocupación
              de una Vivienda Fiscal.
            </label>

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid #222",
                padding: 10,
              }}
            >
              <input
                type="radio"
                checked={tipoSolicitud === "CAMBIO_VIVIENDA"}
                onChange={() => setTipoSolicitud("CAMBIO_VIVIENDA")}
              />
              Solicito mi inscripción como postulante para CAMBIO DE VIVIENDA.
            </label>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            1. Conozco, cumplo con los requisitos y acepto sin objeción alguna
            las condiciones del Reglamento.
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={aceptaReglamento}
              onChange={(e) => setAceptaReglamento(e.target.checked)}
            />
            Acepto el reglamento y declaro bajo juramento que los datos
            consignados son veraces. *
          </label>
        </Box>

        <Box title="2. Mis datos personales son:">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 220px 1fr",
              gap: 10,
            }}
          >
            <Row label="MR:" requiredMark>
              <input
                value={mr}
                onChange={(e) => setMr(e.target.value)}
                style={{ width: "100%" }}
              />
            </Row>

            <Row label="Nº Afiliado DIBA:">
              <input
                value={afiliadoDiba}
                onChange={(e) => setAfiliadoDiba(e.target.value)}
                style={{ width: "100%" }}
              />
            </Row>

            <Row label="Grado y escalafón:">
              <input
                value={gradoEscalafon}
                onChange={(e) => setGradoEscalafon(e.target.value)}
                style={{ width: "100%" }}
              />
            </Row>

            <Row label=" ">
              <div />
            </Row>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Row label="Apellido:" requiredMark>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)} style={{ width: "100%" }} />
            </Row>
            <Row label="Nombres:" requiredMark>
              <input value={nombres} onChange={(e) => setNombres(e.target.value)} style={{ width: "100%" }} />
            </Row>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Row label="Destino actual:">
              <input value={destinoActual} onChange={(e) => setDestinoActual(e.target.value)} style={{ width: "100%" }} />
            </Row>
            <Row label="Destino futuro:">
              <input value={destinoFuturo} onChange={(e) => setDestinoFuturo(e.target.value)} style={{ width: "100%" }} />
            </Row>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Row label="Teléfono actual:">
              <input value={telefonoActual} onChange={(e) => setTelefonoActual(e.target.value)} style={{ width: "100%" }} />
            </Row>
            <Row label="Teléfono futuro:">
              <input value={telefonoFuturo} onChange={(e) => setTelefonoFuturo(e.target.value)} style={{ width: "100%" }} />
            </Row>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            3. Fecha último ascenso / Años de servicio según Recibo de Haberes
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Row label="Fecha último ascenso:">
              <input value={fechaUltimoAscenso} onChange={(e) => setFechaUltimoAscenso(e.target.value)} style={{ width: "100%" }} />
            </Row>
            <Row label="Años de servicio (recibo):">
              <input value={aniosServicioRecibo} onChange={(e) => setAniosServicioRecibo(e.target.value)} style={{ width: "100%" }} />
            </Row>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            4. Agrego fotocopia autenticada de la FIDOFAC / Actualización de FIDOFAC
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <YesNoControl value={agregaFidofac} onChange={setAgregaFidofac} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Adjuntar (opcional):</div>
              <input type="file" onChange={(e) => setFidofacFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            5. Conviviré con las siguientes personas de cuya conducta y actos asumo la absoluta responsabilidad.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button type="button" onClick={addConviviente}>
              ➕ Agregar renglón
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["APELLIDO Y NOMBRES", "RELACIÓN", "A CARGO (SI/NO)", "EDAD", "DNI", "DIBA", ""].map((h) => (
                    <th key={h} style={{ border: "1px solid #222", padding: 8, textAlign: "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convivientes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ border: "1px solid #222", padding: 10, opacity: 0.8 }}>
                      Sin renglones. Use “Agregar renglón”.
                    </td>
                  </tr>
                ) : (
                  convivientes.map((c, idx) => (
                    <tr key={`conv_${idx}`}>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={c.apellidoNombres} onChange={(e) => updateConviviente(idx, { apellidoNombres: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={c.relacion} onChange={(e) => updateConviviente(idx, { relacion: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <select value={c.aCargo} onChange={(e) => updateConviviente(idx, { aCargo: e.target.value as any })} style={{ width: "100%" }}>
                          <option value="">—</option>
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={c.edad} onChange={(e) => updateConviviente(idx, { edad: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={c.dni} onChange={(e) => updateConviviente(idx, { dni: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={c.diba} onChange={(e) => updateConviviente(idx, { diba: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <button type="button" onClick={() => removeConviviente(idx)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            6. Animales domésticos (vivienda tipo casa): indicar especie, raza, edad, sexo, peso, etc.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button type="button" onClick={addMascota}>
              ➕ Agregar mascota
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ESPECIE", "RAZA", "EDAD", "SEXO", "PESO", "CERT. VACUNACIÓN (archivo)", ""].map((h) => (
                    <th key={h} style={{ border: "1px solid #222", padding: 8, textAlign: "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mascotas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ border: "1px solid #222", padding: 10, opacity: 0.8 }}>
                      Sin mascotas cargadas. Use “Agregar mascota”.
                    </td>
                  </tr>
                ) : (
                  mascotas.map((m, idx) => (
                    <tr key={`mas_${idx}`}>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={m.especie} onChange={(e) => updateMascota(idx, { especie: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={m.raza} onChange={(e) => updateMascota(idx, { raza: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={m.edad} onChange={(e) => updateMascota(idx, { edad: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={m.sexo} onChange={(e) => updateMascota(idx, { sexo: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input value={m.peso} onChange={(e) => updateMascota(idx, { peso: e.target.value })} style={{ width: "100%" }} />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <input
                          type="file"
                          onChange={(e) => updateMascota(idx, { certificadoFile: e.target.files?.[0] || null })}
                        />
                      </td>
                      <td style={{ border: "1px solid #222", padding: 6 }}>
                        <button type="button" onClick={() => removeMascota(idx)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            7. Soy (o familiares a cargo) propietario de viviendas en la zona naval de interés. En caso afirmativo agrego escrituras y contratos.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <YesNoControl value={tienePropiedadesZona} onChange={setTienePropiedadesZona} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Adjuntar escrituras/contratos:</div>
              <input type="file" onChange={(e) => setEscriturasYContratosFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div style={{ border: "1px solid #222", padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Dirección I</div>
              <input value={prop1.direccion} onChange={(e) => setProp1((p) => ({ ...p, direccion: e.target.value }))} style={{ width: "100%" }} />
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>Observaciones</div>
              <input value={prop1.observaciones} onChange={(e) => setProp1((p) => ({ ...p, observaciones: e.target.value }))} style={{ width: "100%" }} />
            </div>

            <div style={{ border: "1px solid #222", padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Dirección II</div>
              <input value={prop2.direccion} onChange={(e) => setProp2((p) => ({ ...p, direccion: e.target.value }))} style={{ width: "100%" }} />
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>Observaciones</div>
              <input value={prop2.observaciones} onChange={(e) => setProp2((p) => ({ ...p, observaciones: e.target.value }))} style={{ width: "100%" }} />
            </div>

            <div style={{ border: "1px solid #222", padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Dirección III</div>
              <input value={prop3.direccion} onChange={(e) => setProp3((p) => ({ ...p, direccion: e.target.value }))} style={{ width: "100%" }} />
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>Observaciones</div>
              <input value={prop3.observaciones} onChange={(e) => setProp3((p) => ({ ...p, observaciones: e.target.value }))} style={{ width: "100%" }} />
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Verificó el contenido del Artículo 5.06., incisos 3 y 4.</div>
            <YesNoControl value={verificoArticulo506} onChange={setVerificoArticulo506} />
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            8. Tengo problemas socioeconómicos atendibles e inicié el trámite correspondiente por Oficio:
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <YesNoControl value={tieneProblemasSocio} onChange={setTieneProblemasSocio} />
            <input value={oficioSocio} onChange={(e) => setOficioSocio(e.target.value)} placeholder="Oficio: ..." style={{ width: "55%" }} />
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            9. Agrego certificado de vacunación de los animales domésticos mencionados en punto 6.
          </div>
          <YesNoControl value={agregaCertVacunacion} onChange={setAgregaCertVacunacion} />
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            10. Me encuentro declarado “INEPTO” por la Dirección General del Personal Naval para ocupar viviendas fiscales.
          </div>
          <YesNoControl value={ineptoDGPN} onChange={setIneptoDGPN} />
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            11. Agrego fotocopia de mi último Recibo de Haberes.
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <YesNoControl value={agregaReciboHaberes} onChange={setAgregaReciboHaberes} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Adjuntar:</div>
              <input type="file" onChange={(e) => setReciboHaberesFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            12. Total de años de ocupación previa en la zona naval solicitada:
          </div>
          <input value={aniosOcupacionPrevia} onChange={(e) => setAniosOcupacionPrevia(e.target.value)} style={{ width: "100%" }} />
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            13. Si no me encuentro presente el día de la asignación, autorizo como representante(s):
          </div>

          <div style={{ border: "1px solid #222", padding: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>REPRESENTANTE I</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
              <Row label="Apellido y nombres:">
                <input value={rep1.apellidoNombres} onChange={(e) => setRep1((p) => ({ ...p, apellidoNombres: e.target.value }))} style={{ width: "100%" }} />
              </Row>
              <Row label="Grado:">
                <input value={rep1.grado} onChange={(e) => setRep1((p) => ({ ...p, grado: e.target.value }))} style={{ width: "100%" }} />
              </Row>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 200px", gap: 10 }}>
              <Row label="M.R.:">
                <input value={rep1.mr} onChange={(e) => setRep1((p) => ({ ...p, mr: e.target.value }))} style={{ width: "100%" }} />
              </Row>
              <Row label="Destino:">
                <input value={rep1.destino} onChange={(e) => setRep1((p) => ({ ...p, destino: e.target.value }))} style={{ width: "100%" }} />
              </Row>
              <Row label="Teléfono:">
                <input value={rep1.telefono} onChange={(e) => setRep1((p) => ({ ...p, telefono: e.target.value }))} style={{ width: "100%" }} />
              </Row>
            </div>
          </div>

          <div style={{ border: "1px solid #222", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>REPRESENTANTE II</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
              <Row label="Apellido y nombres:">
                <input value={rep2.apellidoNombres} onChange={(e) => setRep2((p) => ({ ...p, apellidoNombres: e.target.value }))} style={{ width: "100%" }} />
              </Row>
              <Row label="Grado:">
                <input value={rep2.grado} onChange={(e) => setRep2((p) => ({ ...p, grado: e.target.value }))} style={{ width: "100%" }} />
              </Row>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 200px", gap: 10 }}>
              <Row label="M.R.:">
                <input value={rep2.mr} onChange={(e) => setRep2((p) => ({ ...p, mr: e.target.value }))} style={{ width: "100%" }} />
              </Row>
              <Row label="Destino:">
                <input value={rep2.destino} onChange={(e) => setRep2((p) => ({ ...p, destino: e.target.value }))} style={{ width: "100%" }} />
              </Row>
              <Row label="Teléfono:">
                <input value={rep2.telefono} onChange={(e) => setRep2((p) => ({ ...p, telefono: e.target.value }))} style={{ width: "100%" }} />
              </Row>
            </div>
          </div>

          <div style={{ marginTop: 8, ...small }}>
            Acepto todas las decisiones que el/los representante/s tome/n respecto a la elección que haga/n.
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            14. Autorizo descuentos de compensaciones por uso (Alquiler/Mantenimiento/Reparaciones/Expensas) del haber mensual.
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={autorizaDescuentos} onChange={(e) => setAutorizaDescuentos(e.target.checked)} />
            Autorizo descuentos.
          </label>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            15. Autorizo administración de expensas comunes por Administrador bajo supervisión del Organismo Administrador.
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={autorizaAdministradorExpensas} onChange={(e) => setAutorizaAdministradorExpensas(e.target.checked)} />
            Autorizo administración de expensas.
          </label>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            16. Fecha estimada de traslado a la zona:
          </div>
          <input type="date" value={fechaEstimadaTraslado} onChange={(e) => setFechaEstimadaTraslado(e.target.value)} />
        </Box>

        <Box title="AGREGADOS (marcar SI/NO)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <div>1. Fotocopia autenticada de la FIDOFAC.</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoFidofac || "—"}</div>

            <div>2. Certificados de vacunación de animales domésticos.</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoVacunacion || "—"}</div>

            <div>3. Copia de escrituras y/o contratos de locación (si corresponde).</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoEscrituras || "—"}</div>

            <div>4. Fotocopia del último Recibo de Haberes.</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoRecibo || "—"}</div>
          </div>
        </Box>

        <div style={{ borderTop: "2px solid #222", marginTop: 14, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <button type="button" onClick={() => navigate("/app/postulante")}>
              Cancelar
            </button>

            <button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar ANEXO 01"}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: "right", fontWeight: 800 }}>
            Firma del Solicitante
          </div>
        </div>
      </form>
    </div>
  );
}
