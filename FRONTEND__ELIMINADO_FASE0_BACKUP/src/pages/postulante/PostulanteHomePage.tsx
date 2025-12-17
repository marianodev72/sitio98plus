// src/pages/postulante/PostulanteHomePage.tsx

import { useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../api/client";
import { darConformidadAnexo02 } from "../../api/formularios";

type ZonaOpt = { value: string; label: string };

function buildZonaOptions(): ZonaOpt[] {
  const arr: ZonaOpt[] = [];
  for (let i = 0; i <= 99; i++) {
    const v = String(i).padStart(2, "0");
    arr.push({ value: v, label: v });
  }
  return arr;
}

function buildAniosOptions(): ZonaOpt[] {
  const arr: ZonaOpt[] = [];
  for (let i = 0; i <= 40; i++) {
    const v = String(i).padStart(2, "0");
    arr.push({ value: v, label: v });
  }
  return arr;
}

type Conviviente = {
  apellidoNombres: string;
  relacion: string;
  aCargo: "SI" | "NO";
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
  file?: File | null;
};

type Propiedad = {
  direccion: string;
  observaciones: string;
};

export default function PostulanteHomePage() {
  const { user } = useAuthStore();

  const zonaOptions = useMemo(() => buildZonaOptions(), []);
  const aniosOptions = useMemo(() => buildAniosOptions(), []);

  const [tab, setTab] = useState<"INICIAR" | "MIS" | "ASIGNACIONES">("INICIAR");

  const hoy = new Date();
  const fechaSistema = hoy.toISOString().slice(0, 10);

  // Campos base
  const [lugar, setLugar] = useState("");
  const [alSenor, setAlSenor] = useState("");
  const [zonaNaval, setZonaNaval] = useState("00");

  const [solicitaInscripcion, setSolicitaInscripcion] = useState(true);
  const [solicitaCambio, setSolicitaCambio] = useState(false);

  const [aceptaReglamento, setAceptaReglamento] = useState(false);

  // Datos personales
  const [mr, setMr] = useState(user?.matricula || "");
  const [afiliadoDiba, setAfiliadoDiba] = useState("");
  const [gradoEscalafon, setGradoEscalafon] = useState("");
  const [apellido, setApellido] = useState(user?.apellido || "");
  const [nombres, setNombres] = useState(user?.nombre || "");
  const [destinoActual, setDestinoActual] = useState("");
  const [destinoFuturo, setDestinoFuturo] = useState("");
  const [telefonoActual, setTelefonoActual] = useState("");
  const [telefonoFuturo, setTelefonoFuturo] = useState("");

  const [fechaUltimoAscenso, setFechaUltimoAscenso] = useState("");
  const [aniosServicio, setAniosServicio] = useState("");

  // Adjuntos
  const [fidofacFile, setFidofacFile] = useState<File | null>(null);
  const [reciboFile, setReciboFile] = useState<File | null>(null);

  // Convivientes
  const [convivientes, setConvivientes] = useState<Conviviente[]>([]);
  function addConviviente() {
    setConvivientes((p) => [
      ...p,
      { apellidoNombres: "", relacion: "", aCargo: "SI", edad: "", dni: "", diba: "" },
    ]);
  }
  function removeConviviente(idx: number) {
    setConvivientes((p) => p.filter((_, i) => i !== idx));
  }
  function updateConviviente(idx: number, patch: Partial<Conviviente>) {
    setConvivientes((p) => p.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  // Mascotas
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  function addMascota() {
    setMascotas((p) => [...p, { especie: "", raza: "", edad: "", sexo: "", peso: "", file: null }]);
  }
  function removeMascota(idx: number) {
    setMascotas((p) => p.filter((_, i) => i !== idx));
  }
  function updateMascota(idx: number, patch: Partial<Mascota>) {
    setMascotas((p) => p.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  // Propiedades
  const [tienePropiedadesZona, setTienePropiedadesZona] = useState(false);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([{ direccion: "", observaciones: "" }]);
  function addPropiedad() {
    setPropiedades((p) => (p.length >= 3 ? p : [...p, { direccion: "", observaciones: "" }]));
  }
  function removePropiedad(idx: number) {
    setPropiedades((p) => p.filter((_, i) => i !== idx));
  }
  function updatePropiedad(idx: number, patch: Partial<Propiedad>) {
    setPropiedades((p) => p.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  const [verificoArticulo506, setVerificoArticulo506] = useState(false);

  const [tieneProblemasSocioeconomicos, setTieneProblemasSocioeconomicos] = useState(false);
  const [oficioSocioeconomico, setOficioSocioeconomico] = useState("");

  const [declaradoInepto, setDeclaradoInepto] = useState(false);

  const [aniosOcupacionPreviaZona, setAniosOcupacionPreviaZona] = useState("00");

  // Representantes
  const [rep1, setRep1] = useState({
    apellidoNombres: "",
    grado: "",
    mr: "",
    destino: "",
    telefono: "",
  });
  const [rep2, setRep2] = useState({
    apellidoNombres: "",
    grado: "",
    mr: "",
    destino: "",
    telefono: "",
  });

  const [autorizaDescuentos, setAutorizaDescuentos] = useState(false);
  const [autorizaAdministradorExpensas, setAutorizaAdministradorExpensas] = useState(false);

  const [fechaEstimadaTraslado, setFechaEstimadaTraslado] = useState("");

  // Mis postulaciones
  const [loadingMis, setLoadingMis] = useState(false);
  const [mis, setMis] = useState<any[]>([]);

  // Mis asignaciones (ANEXO_02)
  const [loadingAsig, setLoadingAsig] = useState(false);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [loadingConformarId, setLoadingConformarId] = useState<string | null>(null);

  const [loadingEnviar, setLoadingEnviar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function cargarMis() {
    try {
      setLoadingMis(true);
      setError(null);
      const anexos = await getMisAnexos("ANEXO_01");
      setMis(anexos || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cargando mis postulaciones.");
    } finally {
      setLoadingMis(false);
    }
  }

  async function cargarAsignaciones() {
    try {
      setLoadingAsig(true);
      setError(null);
      const anexos = await getMisAnexos("ANEXO_02");
      setAsignaciones(anexos || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cargando mis asignaciones.");
    } finally {
      setLoadingAsig(false);
    }
  }

  async function onConformar(anexoId: string) {
    setError(null);
    setOk(null);
    try {
      setLoadingConformarId(anexoId);
      const resp = await darConformidadAnexo02(anexoId);
      setOk(resp?.message || "Conformidad registrada.");
      await cargarAsignaciones();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error registrando conformidad.");
    } finally {
      setLoadingConformarId(null);
    }
  }

  async function enviar() {
    setError(null);
    setOk(null);

    // Validaciones mínimas institucionales
    if (!lugar.trim()) return setError("Debe completar Lugar.");
    if (!alSenor.trim()) return setError("Debe completar 'AL SEÑOR'.");
    if (!zonaNaval) return setError("Debe seleccionar Zona Naval.");
    if (!solicitaInscripcion && !solicitaCambio) return setError("Debe tildar una opción de solicitud.");
    if (!aceptaReglamento) return setError("Debe aceptar el Reglamento (punto 1).");
    if (!mr.trim()) return setError("Debe completar MR.");
    if (!gradoEscalafon.trim()) return setError("Debe completar Grado y Escalafón.");
    if (!apellido.trim() || !nombres.trim()) return setError("Debe completar Apellido y Nombres.");
    if (!destinoActual.trim()) return setError("Debe completar Destino Actual.");
    if (!telefonoActual.trim()) return setError("Debe completar Teléfono Actual.");
    if (!reciboFile) return setError("Debe adjuntar el último Recibo de Haberes.");
    if (!autorizaDescuentos) return setError("Debe autorizar descuentos (punto 13).");
    if (!autorizaAdministradorExpensas) return setError("Debe autorizar administración de expensas (punto 14).");

    const datos: any = {
      lugar: lugar.trim(),
      fechaSistema: new Date().toISOString(),

      alSenor: alSenor.trim(),
      zonaNaval,

      tipoSolicitud: [
        ...(solicitaInscripcion ? ["INSCRIPCION"] : []),
        ...(solicitaCambio ? ["CAMBIO"] : []),
      ],

      aceptaReglamento,

      mr: mr.trim(),
      afiliadoDiba: afiliadoDiba.trim(),
      gradoEscalafon: gradoEscalafon.trim(),
      apellido: apellido.trim(),
      nombres: nombres.trim(),
      destinoActual: destinoActual.trim(),
      destinoFuturo: destinoFuturo.trim(),
      telefonoActual: telefonoActual.trim(),
      telefonoFuturo: telefonoFuturo.trim(),

      fechaUltimoAscenso: fechaUltimoAscenso || null,
      aniosServicio: aniosServicio ? Number(aniosServicio) : null,

      convivientes,
      mascotas: mascotas.map((m, idx) => ({
        especie: m.especie,
        raza: m.raza,
        edad: m.edad,
        sexo: m.sexo,
        peso: m.peso,
        docField: `mascota_doc_${idx}`,
      })),

      tienePropiedadesZona,
      propiedades: tienePropiedadesZona ? propiedades : [],
      verificoArticulo506,

      tieneProblemasSocioeconomicos,
      oficioSocioeconomico: tieneProblemasSocioeconomicos ? oficioSocioeconomico.trim() : "",

      declaradoInepto,

      aniosOcupacionPreviaZona,

      representante1: rep1,
      representante2: rep2,

      autorizaDescuentos,
      autorizaAdministradorExpensas,

      fechaEstimadaTraslado: fechaEstimadaTraslado || null,
    };

    const fd = new FormData();
    fd.append("datos", JSON.stringify(datos));

    if (fidofacFile) fd.append("adj_fidofac", fidofacFile);
    if (reciboFile) fd.append("adj_recibo_haberes", reciboFile);

    mascotas.forEach((m, idx) => {
      if (m.file) fd.append(`mascota_doc_${idx}`, m.file);
    });

    try {
      setLoadingEnviar(true);
      const resp = await apiClient.post("/formularios/ANEXO_01", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOk(resp.data?.message || "Postulación enviada.");

      // reset parcial
      setLugar("");
      setAlSenor("");
      setSolicitaInscripcion(true);
      setSolicitaCambio(false);
      setAceptaReglamento(false);
      setFechaUltimoAscenso("");
      setAniosServicio("");
      setFidofacFile(null);
      setReciboFile(null);
      setConvivientes([]);
      setMascotas([]);
      setTienePropiedadesZona(false);
      setPropiedades([{ direccion: "", observaciones: "" }]);
      setVerificoArticulo506(false);
      setTieneProblemasSocioeconomicos(false);
      setOficioSocioeconomico("");
      setDeclaradoInepto(false);
      setAniosOcupacionPreviaZona("00");
      setRep1({ apellidoNombres: "", grado: "", mr: "", destino: "", telefono: "" });
      setRep2({ apellidoNombres: "", grado: "", mr: "", destino: "", telefono: "" });
      setAutorizaDescuentos(false);
      setAutorizaAdministradorExpensas(false);
      setFechaEstimadaTraslado("");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error enviando la postulación.");
    } finally {
      setLoadingEnviar(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Panel Postulante</h1>
          <p className="text-xs text-slate-400">
            Postulaciones y Asignaciones en secciones separadas (institucional).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold border",
              tab === "INICIAR"
                ? "bg-sky-600 text-white border-sky-500"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800",
            ].join(" ")}
            onClick={() => setTab("INICIAR")}
          >
            INICIAR POSTULACIÓN (ANEXO 01)
          </button>

          <button
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold border",
              tab === "MIS"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800",
            ].join(" ")}
            onClick={() => {
              setTab("MIS");
              cargarMis();
            }}
          >
            MIS POSTULACIONES
          </button>

          <button
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold border",
              tab === "ASIGNACIONES"
                ? "bg-amber-600 text-white border-amber-500"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800",
            ].join(" ")}
            onClick={() => {
              setTab("ASIGNACIONES");
              cargarAsignaciones();
            }}
          >
            ASIGNACIONES (ANEXO 02)
          </button>
        </div>
      </header>

      {error && (
        <div className="text-xs text-rose-200 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {ok && (
        <div className="text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">
          {ok}
        </div>
      )}

      {/* ✅ TAB: ASIGNACIONES */}
      {tab === "ASIGNACIONES" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Mis asignaciones (ANEXO 02)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Esta caja es separada de Postulaciones. Si hay una asignación pendiente, podés DAR CONFORMIDAD.
              </p>
            </div>

            <button
              onClick={cargarAsignaciones}
              disabled={loadingAsig}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-60"
            >
              {loadingAsig ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {asignaciones.length === 0 ? (
              <div className="text-xs text-slate-400">No hay asignaciones registradas.</div>
            ) : (
              asignaciones.map((a: any) => {
                const flujo = a?.datos?.flujo || "";
                const firmas = a?.datos?.firmas || {};
                const postOk = !!firmas?.postulante?.ok;

                const puedeConformar =
                  a?.estado !== "CERRADO" &&
                  !postOk &&
                  (flujo === "PENDIENTE_CONFORMIDAD_POSTULANTE" || !flujo);

                return (
                  <div
                    key={a._id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">ANEXO 02 · Asignación</div>
                      <div className="text-[10px] text-slate-400">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                      </div>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      Estado: <span className="text-slate-200">{a.estado}</span>
                      {" · "}
                      Flujo: <span className="text-slate-200">{flujo || "-"}</span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-300">
                      ViviendaId: {a?.datos?.viviendaId || "-"}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400">
                      Conformidad:{" "}
                      <span className={postOk ? "text-emerald-200" : "text-amber-200"}>
                        {postOk ? "OK" : "PENDIENTE"}
                      </span>
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => onConformar(a._id)}
                        disabled={!puedeConformar || loadingConformarId === a._id}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-semibold border",
                          puedeConformar
                            ? "bg-amber-600 text-white border-amber-500 hover:bg-amber-500"
                            : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {loadingConformarId === a._id ? "ENVIANDO..." : "DAR CONFORMIDAD"}
                      </button>

                      {!puedeConformar && (
                        <div className="text-[10px] text-slate-500 mt-2">
                          (No hay acciones pendientes para esta asignación.)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ✅ TAB: MIS POSTULACIONES */}
      {tab === "MIS" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Mis postulaciones (ANEXO 01)</h2>
            <button
              onClick={cargarMis}
              disabled={loadingMis}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-60"
            >
              {loadingMis ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {mis.length === 0 ? (
              <div className="text-xs text-slate-400">No hay postulaciones registradas.</div>
            ) : (
              mis.map((a: any) => (
                <div
                  key={a._id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">ANEXO 01</div>
                    <div className="text-[10px] text-slate-400">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Estado: <span className="text-slate-200">{a.estado}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-300">
                    Lugar: {a.datos?.lugar || "-"} · Zona: {a.datos?.zonaNaval || "-"}
                  </div>
                  {Array.isArray(a.adjuntos) && a.adjuntos.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-400">Adjuntos: {a.adjuntos.length}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ✅ TAB: INICIAR (tu ANEXO_01 actual, intacto) */}
      {tab === "INICIAR" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-center text-slate-100 font-bold">ARMADA ARGENTINA</div>
            <div className="text-center text-slate-100 font-semibold mt-2">
              FORMULARIO DE INSCRIPCIÓN PARA OCUPAR VIVIENDA FISCAL DE LA ARMADA
            </div>
            <div className="text-center text-slate-200 text-sm mt-2">DECLARACIÓN JURADA DE POSTULACIÓN</div>
          </div>

          {/* Lugar y fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Lugar *</label>
              <input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Fecha (sistema)</label>
              <input
                value={fechaSistema}
                readOnly
                className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300"
              />
            </div>
          </div>

          {/* Destinatario */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px] gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">AL SEÑOR * (texto libre)</label>
                <input
                  value={alSenor}
                  onChange={(e) => setAlSenor(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Zona Naval *</label>
                <select
                  value={zonaNaval}
                  onChange={(e) => setZonaNaval(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                >
                  {zonaOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-200">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={solicitaInscripcion}
                  onChange={(e) => setSolicitaInscripcion(e.target.checked)}
                />
                <span>Solicito mi inscripción como postulante para acceder a la ocupación de una Vivienda Fiscal...</span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={solicitaCambio}
                  onChange={(e) => setSolicitaCambio(e.target.checked)}
                />
                <span>Solicito mi inscripción como postulante para CAMBIO DE VIVIENDA...</span>
              </label>
            </div>
          </div>

          {/* Reglamento */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-xs text-slate-200 font-semibold mb-2">
              Por lo expuesto precedentemente hago constar que:
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={aceptaReglamento}
                onChange={(e) => setAceptaReglamento(e.target.checked)}
              />
              <span>
                Conozco, cumplo con los requisitos y acepto sin objeción alguna, las condiciones establecidas en el
                Reglamento de Viviendas Fiscales de la Armada (R.G-6-002 “P”).
              </span>
            </label>
          </div>

          {/* Datos personales */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
            <div className="text-xs text-slate-200 font-semibold">Mis datos personales son:</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="MR *" value={mr} onChange={setMr} />
              <Field label="Nº AFILIADO DIBA" value={afiliadoDiba} onChange={setAfiliadoDiba} />
              <Field label="GRADO Y ESCALAFÓN *" value={gradoEscalafon} onChange={setGradoEscalafon} />
              <Field label="APELLIDO *" value={apellido} onChange={setApellido} />
              <Field label="NOMBRES *" value={nombres} onChange={setNombres} />
              <Field label="DESTINO ACTUAL *" value={destinoActual} onChange={setDestinoActual} />
              <Field label="DESTINO FUTURO" value={destinoFuturo} onChange={setDestinoFuturo} />
              <Field label="TELÉFONO ACTUAL *" value={telefonoActual} onChange={setTelefonoActual} />
              <Field label="TELÉFONO FUTURO" value={telefonoFuturo} onChange={setTelefonoFuturo} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Fecha último ascenso</label>
                <input
                  type="date"
                  value={fechaUltimoAscenso}
                  onChange={(e) => setFechaUltimoAscenso(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                />
              </div>
              <Field label="Años de servicio (Recibo Haberes)" value={aniosServicio} onChange={setAniosServicio} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FileField
                label="FIDOFAC / Formulario Contribuyente (pdf/jpg)"
                onChange={setFidofacFile}
                note="Adjuntar pdf/jpg/png"
              />
              <FileField
                label="Último Recibo de Haberes * (pdf/jpg)"
                onChange={setReciboFile}
                note="Obligatorio"
              />
            </div>
          </div>

          {/* Convivientes */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-200 font-semibold">
                Conviviré con las siguientes personas (agregar filas)
              </div>
              <button
                type="button"
                onClick={addConviviente}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100"
              >
                + Agregar
              </button>
            </div>

            {convivientes.length === 0 ? (
              <div className="text-xs text-slate-400">Sin personas cargadas.</div>
            ) : (
              <div className="space-y-2">
                {convivientes.map((c, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Field
                        label="APELLIDO Y NOMBRES"
                        value={c.apellidoNombres}
                        onChange={(v) => updateConviviente(idx, { apellidoNombres: v })}
                      />
                      <Field
                        label="RELACIÓN"
                        value={c.relacion}
                        onChange={(v) => updateConviviente(idx, { relacion: v })}
                      />
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300">A CARGO (SI/NO)</label>
                        <select
                          value={c.aCargo}
                          onChange={(e) => updateConviviente(idx, { aCargo: e.target.value as any })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                        >
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      <Field label="EDAD" value={c.edad} onChange={(v) => updateConviviente(idx, { edad: v })} />
                      <Field label="D.N.I." value={c.dni} onChange={(v) => updateConviviente(idx, { dni: v })} />
                      <Field label="DIBA" value={c.diba} onChange={(v) => updateConviviente(idx, { diba: v })} />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeConviviente(idx)}
                      className="rounded-lg bg-rose-950/40 border border-rose-900 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-950/60"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mascotas */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-200 font-semibold">
                Animales domésticos (agregar filas + adjunto por fila)
              </div>
              <button
                type="button"
                onClick={addMascota}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100"
              >
                + Agregar
              </button>
            </div>

            {mascotas.length === 0 ? (
              <div className="text-xs text-slate-400">Sin mascotas cargadas.</div>
            ) : (
              <div className="space-y-2">
                {mascotas.map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Field label="Especie" value={m.especie} onChange={(v) => updateMascota(idx, { especie: v })} />
                      <Field label="Raza" value={m.raza} onChange={(v) => updateMascota(idx, { raza: v })} />
                      <Field label="Edad" value={m.edad} onChange={(v) => updateMascota(idx, { edad: v })} />
                      <Field label="Sexo" value={m.sexo} onChange={(v) => updateMascota(idx, { sexo: v })} />
                      <Field label="Peso" value={m.peso} onChange={(v) => updateMascota(idx, { peso: v })} />

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300">Documentación (pdf/jpg)</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => updateMascota(idx, { file: e.target.files?.[0] || null })}
                          className="w-full text-xs text-slate-200"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMascota(idx)}
                      className="rounded-lg bg-rose-950/40 border border-rose-900 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-950/60"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Propiedades */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={tienePropiedadesZona}
                onChange={(e) => setTienePropiedadesZona(e.target.checked)}
              />
              <span>Soy (o familiar a cargo) propietario de vivienda/s en zona naval de interés.</span>
            </label>

            {tienePropiedadesZona && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-300">Direcciones (máx. 3)</div>
                  <button
                    type="button"
                    onClick={addPropiedad}
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100"
                  >
                    + Agregar dirección
                  </button>
                </div>

                <div className="space-y-2">
                  {propiedades.map((p, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 space-y-2">
                      <Field
                        label={`Dirección ${idx + 1}`}
                        value={p.direccion}
                        onChange={(v) => updatePropiedad(idx, { direccion: v })}
                      />
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300">Observaciones</label>
                        <textarea
                          rows={2}
                          value={p.observaciones}
                          onChange={(e) => updatePropiedad(idx, { observaciones: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                        />
                      </div>

                      {propiedades.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePropiedad(idx)}
                          className="rounded-lg bg-rose-950/40 border border-rose-900 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-950/60"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Checks finales */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={verificoArticulo506}
                onChange={(e) => setVerificoArticulo506(e.target.checked)}
              />
              <span>Verificó el contenido del Artículo 5.06., incisos 3 y 4 del R.G-6-002 “P”.</span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={tieneProblemasSocioeconomicos}
                onChange={(e) => setTieneProblemasSocioeconomicos(e.target.checked)}
              />
              <span>Tengo problemas socioeconómicos atendibles e inicié trámite por Oficio:</span>
            </label>

            {tieneProblemasSocioeconomicos && (
              <Field label="Oficio" value={oficioSocioeconomico} onChange={setOficioSocioeconomico} />
            )}

            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={declaradoInepto}
                onChange={(e) => setDeclaradoInepto(e.target.checked)}
              />
              <span>Me encuentro declarado “INEPTO” por DGPN para ocupar viviendas fiscales.</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Total años ocupación previa (00-40)</label>
                <select
                  value={aniosOcupacionPreviaZona}
                  onChange={(e) => setAniosOcupacionPreviaZona(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                >
                  {aniosOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Fecha estimada traslado a la zona</label>
                <input
                  type="date"
                  value={fechaEstimadaTraslado}
                  onChange={(e) => setFechaEstimadaTraslado(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Representantes */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
            <div className="text-xs text-slate-200 font-semibold">
              Representantes (si no se encuentra presente el día de la asignación)
            </div>

            <Group title="REPRESENTANTE I" value={rep1} setValue={setRep1} />
            <Group title="REPRESENTANTE II" value={rep2} setValue={setRep2} />
          </div>

          {/* Autorizaciones */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={autorizaDescuentos}
                onChange={(e) => setAutorizaDescuentos(e.target.checked)}
              />
              <span>
                Autorizo descuentos por compensaciones (alquiler, mantenimiento/reparaciones) y expensas/gastos comunes.
                *
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={autorizaAdministradorExpensas}
                onChange={(e) => setAutorizaAdministradorExpensas(e.target.checked)}
              />
              <span>
                Autorizo administración de expensas por Administrador, bajo supervisión del Organismo Administrador y
                Jefe Militar. *
              </span>
            </label>
          </div>

          <button
            onClick={enviar}
            disabled={loadingEnviar}
            className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white"
          >
            {loadingEnviar ? "ENVIANDO..." : "ENVIAR POSTULACIÓN (ANEXO 01)"}
          </button>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-slate-300">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
      />
    </div>
  );
}

function FileField({
  label,
  onChange,
  note,
}: {
  label: string;
  onChange: (f: File | null) => void;
  note?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-slate-300">{label}</label>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="w-full text-xs text-slate-200"
      />
      {note && <div className="text-[10px] text-slate-500">{note}</div>}
    </div>
  );
}

function Group({
  title,
  value,
  setValue,
}: {
  title: string;
  value: { apellidoNombres: string; grado: string; mr: string; destino: string; telefono: string };
  setValue: (v: any) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 space-y-2">
      <div className="text-xs font-semibold text-slate-100">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field
          label="APELLIDO Y NOMBRES"
          value={value.apellidoNombres}
          onChange={(v) => setValue({ ...value, apellidoNombres: v })}
        />
        <Field label="GRADO" value={value.grado} onChange={(v) => setValue({ ...value, grado: v })} />
        <Field label="M.R." value={value.mr} onChange={(v) => setValue({ ...value, mr: v })} />
        <Field label="DESTINO" value={value.destino} onChange={(v) => setValue({ ...value, destino: v })} />
        <Field label="TELÉFONO" value={value.telefono} onChange={(v) => setValue({ ...value, telefono: v })} />
      </div>
    </div>
  );
}
