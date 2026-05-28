// frontend/src/pages/permisionario/MisAnexosPermisionario.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  infoGridStyle,
  metaStyle,
  noteStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "./uiStyles";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
};

type ViviendaAutocarga = {
  unidad: string;
  dpto: string;
  mb: string;
  mz: string;
  casa: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function clean(v: unknown) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function safeFileNameDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function buildNombreUsuario(user: any) {
  return `${clean(user?.apellido)} ${clean(user?.nombre)}`.trim();
}

function getViviendaDesdeUser(user: any): ViviendaAutocarga {
  const vivienda =
    user?.vivienda ||
    user?.viviendaAsignada ||
    user?.viviendaActual ||
    user?.unidadHabitacional ||
    null;

  return {
    unidad: clean(
      vivienda?.unidad ||
        vivienda?.unidadHabitacional ||
        user?.unidad ||
        user?.unidadHabitacional
    ),
    dpto: clean(vivienda?.dpto || vivienda?.departamento || user?.dpto),
    mb: clean(vivienda?.mb || user?.mb),
    mz: clean(vivienda?.mz || user?.mz),
    casa: clean(
      vivienda?.codigo ||
        vivienda?.casa ||
        vivienda?.viviendaCodigo ||
        user?.casa ||
        user?.viviendaCodigo
    ),
  };
}

export default function MisAnexosPermisionario() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const CODIGOS = [
    "TODOS",
    "ANEXO_01",
    "ANEXO_02",
    "ANEXO_03",
    "ANEXO_04",
    "ANEXO_07",
    "ANEXO_08",
    "ANEXO_09",
    "ANEXO_11",
  ];

  const nombreUsuario = useMemo(() => buildNombreUsuario(user), [user]);
  const viviendaInicial = useMemo(() => getViviendaDesdeUser(user), [user]);

  const [codigo, setCodigo] = useState("TODOS");

  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [openCodigoMenu, setOpenCodigoMenu] = useState(false);

  const [mostrandoNuevo11, setMostrandoNuevo11] = useState(false);
  const [enviando11, setEnviando11] = useState(false);

  const [unidad, setUnidad] = useState(viviendaInicial.unidad);
  const [dpto, setDpto] = useState(viviendaInicial.dpto);
  const [mb, setMb] = useState(viviendaInicial.mb);
  const [mz, setMz] = useState(viviendaInicial.mz);
  const [casa, setCasa] = useState(viviendaInicial.casa);

  const [permGrado, setPermGrado] = useState(clean(user?.grado));
  const [permNombre, setPermNombre] = useState(nombreUsuario);

  const [promotorTipo, setPromotorTipo] = useState<
    "PERMISIONARIO" | "INSPECTOR" | "JEFE_MILITAR" | "OTROS"
  >("PERMISIONARIO");
  const [promotorGrado, setPromotorGrado] = useState(clean(user?.grado));
  const [promotorNombre, setPromotorNombre] = useState(nombreUsuario);

  const [solCambio, setSolCambio] = useState(false);
  const [solReparacion, setSolReparacion] = useState(true);
  const [solVerificacion, setSolVerificacion] = useState(false);
  const [solProvision, setSolProvision] = useState(false);

  const [detalleDe, setDetalleDe] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    setUnidad(viviendaInicial.unidad);
    setDpto(viviendaInicial.dpto);
    setMb(viviendaInicial.mb);
    setMz(viviendaInicial.mz);
    setCasa(viviendaInicial.casa);

    setPermGrado(clean(user?.grado));
    setPermNombre(nombreUsuario);

    if (promotorTipo === "PERMISIONARIO") {
      setPromotorGrado(clean(user?.grado));
      setPromotorNombre(nombreUsuario);
    }
  }, [user, viviendaInicial, nombreUsuario, promotorTipo]);

  useEffect(() => {
    if (promotorTipo === "PERMISIONARIO") {
      setPromotorGrado(clean(user?.grado));
      setPromotorNombre(nombreUsuario);
    }
  }, [promotorTipo, user, nombreUsuario]);

  async function cargar() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const res = await http.get("/formularios/mis-anexos");
      setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
    } catch (e) {
      console.error("[MIS ANEXOS PERMISIONARIO]", e);
      setErrorMsg("La página solicitada no está disponible.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const visibles = useMemo(() => {
    if (codigo === "TODOS") return items;
    return items.filter((a) => up(a.codigo) === codigo);
  }, [items, codigo]);

  async function descargarPdf(id: string, cod: string) {
    try {
      const res = await http.get(`/formularios/${id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_${cod}_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[PDF]", e);
      setErrorMsg("No se pudo descargar el PDF.");
    }
  }

  function resetFormulario11() {
    setUnidad(viviendaInicial.unidad);
    setDpto(viviendaInicial.dpto);
    setMb(viviendaInicial.mb);
    setMz(viviendaInicial.mz);
    setCasa(viviendaInicial.casa);

    setPermGrado(clean(user?.grado));
    setPermNombre(nombreUsuario);

    setPromotorTipo("PERMISIONARIO");
    setPromotorGrado(clean(user?.grado));
    setPromotorNombre(nombreUsuario);

    setSolCambio(false);
    setSolReparacion(true);
    setSolVerificacion(false);
    setSolProvision(false);

    setDetalleDe("");

    const d = new Date();
    setFechaSolicitud(d.toISOString().slice(0, 10));
  }

  async function enviarNuevoAnexo11() {
    if (!detalleDe.trim()) {
      setErrorMsg("Completá el campo 'De:' describiendo el pedido de trabajo.");
      return;
    }

    if (!solCambio && !solReparacion && !solVerificacion && !solProvision) {
      setErrorMsg(
        "Marcá al menos una opción en 'Solicito: Cambio / Reparación / Verificación / Provisión'."
      );
      return;
    }

    setEnviando11(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const datos: any = {
        unidad: unidad || null,
        dpto: dpto || null,
        mb: mb || null,
        mz: mz || null,
        casa: casa || null,

        permisionarioGrado: permGrado || null,
        permisionarioNombre: permNombre || null,

        promotorTipo,
        promotorGrado: promotorGrado || null,
        promotorNombre: promotorNombre || null,

        solicitudTipos: {
          cambio: solCambio,
          reparacion: solReparacion,
          verificacion: solVerificacion,
          provision: solProvision,
        },
        solicitudDetalle: detalleDe.trim(),
        fechaSolicitud: fechaSolicitud || null,
      };

      datos.detallePedido = datos.solicitudDetalle;

      const res = await http.post("/formularios/ANEXO_11", { datos });
      const creado = res.data?.anexo || res.data?.formulario || null;

      if (creado?._id) {
        setInfoMsg(
          "ANEXO 11 creado y enviado al Inspector correctamente. Podrás seguir su estado en el listado."
        );
        setMostrandoNuevo11(false);
        resetFormulario11();
        await cargar();
      } else {
        setErrorMsg(
          "No se pudo crear el ANEXO 11. Verificá los datos o contactá al administrador."
        );
      }
    } catch (e: any) {
      console.error("[ANEXO_11] Error iniciando formulario", e);
      setErrorMsg(
        e?.response?.data?.message ||
          "No se pudo crear el ANEXO 11. Contacte al administrador."
      );
    } finally {
      setEnviando11(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const fieldLabelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    boxSizing: "border-box" as const,
  };

  const readOnlyInputStyle = {
    ...inputStyle,
    background: "rgba(255,255,255,0.035)",
    color: "rgba(255,255,255,0.88)",
  };

  const selectStyle = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
  };

  const alertBaseStyle = {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
  };

  // frontend/src/pages/permisionario/MisAnexosPermisionario.tsx
return (
  <div style={pageStyle}>
    <div style={shellStyle}>
      <div style={heroStyle}>
        <h2 style={titleStyle}>Mis anexos</h2>
        <p style={{ ...subtitleStyle, maxWidth: 800 }}>
          Consultá tus anexos, filtrá por código, descargá PDFs y gestioná los formularios
          habilitados dentro del circuito institucional.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            ...alertBaseStyle,
            border: "1px solid rgba(244,67,54,0.6)",
            background: "rgba(244,67,54,0.12)",
            color: "#ffe5e5",
          }}
        >
          {errorMsg}
        </div>
      )}

      {infoMsg && !errorMsg && (
        <div
          style={{
            ...alertBaseStyle,
            border: "1px solid rgba(76,175,80,0.55)",
            background: "rgba(76,175,80,0.12)",
            color: "#e8ffe8",
          }}
        >
          {infoMsg}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
                ANEXO 01 - Solicitud de cambio de vivienda
              </h3>
              <p style={{ ...noteStyle, marginTop: 10, marginBottom: 0 }}>
                IniciÃ¡ el circuito documental de postulaciÃ³n para cambio de vivienda fiscal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app/permisionario/anexo-01-cambio-vivienda")}
              style={successButtonStyle}
            >
              Iniciar ANEXO 01
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
              ANEXO 04 – Aviso de ausencia prolongada
            </h3>

            <button
              type="button"
              onClick={() => navigate("/app/permisionario/anexo-04/nuevo")}
              style={successButtonStyle}
            >
              Crear ANEXO 04
            </button>
          </div>

          <p style={{ ...noteStyle, marginTop: 12 }}>
            Este trámite es personal del Permisionario. Se inicia desde el panel base y se remite
            a JEFE DE BARRIO, con copia institucional según el circuito definido.
          </p>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
                Reintegros
              </h3>
              <p style={{ ...noteStyle, marginTop: 10, marginBottom: 0 }}>
                Gestiona solicitudes de reintegro con comprobantes y documentacion respaldatoria.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/app/permisionario/anexo-15")}
              style={successButtonStyle}
            >
              Abrir reintegros
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
              ANEXO 11 – Formulario de Pedido de Trabajo
            </h3>

            <button
              type="button"
              onClick={() => setMostrandoNuevo11((v) => !v)}
              style={primaryButtonStyle}
            >
              {mostrandoNuevo11
                ? "Cerrar formulario"
                : "Iniciar ANEXO 11 – Pedido de Trabajo"}
            </button>
          </div>

          {mostrandoNuevo11 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <p style={{ ...subtitleStyle, marginTop: 0, maxWidth: "100%" }}>
                Completá los datos del formulario institucional. Este pedido se enviará al
                Inspector para su gestión y seguimiento.
              </p>

              <div
                style={{
                  ...softCardStyle,
                  background: "rgba(255,235,59,0.10)",
                  border: "1px solid rgba(255,235,59,0.24)",
                  color: "#fff6c7",
                  marginBottom: 16,
                }}
              >
                Los datos del permisionario y la vivienda se cargan automáticamente para evitar
                errores.
              </div>

              <div style={infoGridStyle}>
                <div style={softCardStyle}>
                  <label style={fieldLabelStyle}>
                    Unidad
                    <input type="text" value={unidad} readOnly style={readOnlyInputStyle} />
                  </label>
                </div>

                <div style={softCardStyle}>
                  <label style={fieldLabelStyle}>
                    Dpto.
                    <input type="text" value={dpto} readOnly style={readOnlyInputStyle} />
                  </label>
                </div>

                <div style={softCardStyle}>
                  <label style={fieldLabelStyle}>
                    MB
                    <input type="text" value={mb} readOnly style={readOnlyInputStyle} />
                  </label>
                </div>

                <div style={softCardStyle}>
                  <label style={fieldLabelStyle}>
                    MZ
                    <input type="text" value={mz} readOnly style={readOnlyInputStyle} />
                  </label>
                </div>

                <div style={softCardStyle}>
                  <label style={fieldLabelStyle}>
                    Casa
                    <input type="text" value={casa} readOnly style={readOnlyInputStyle} />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <h4 style={{ ...sectionTitleStyle, fontSize: 16, marginBottom: 10 }}>
                  Permisionario
                </h4>

                <div style={infoGridStyle}>
                  <div style={softCardStyle}>
                    <label style={fieldLabelStyle}>
                      Grado
                      <input type="text" value={permGrado} readOnly style={readOnlyInputStyle} />
                    </label>
                  </div>

                  <div style={softCardStyle}>
                    <label style={fieldLabelStyle}>
                      Apellido y nombre
                      <input type="text" value={permNombre} readOnly style={readOnlyInputStyle} />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <h4 style={{ ...sectionTitleStyle, fontSize: 16, marginBottom: 10 }}>
                  Promotor
                </h4>

                <div style={softCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 14,
                      color: "#ffffff",
                    }}
                  >
                    <label>
                      <input
                        type="radio"
                        name="promotorTipo"
                        value="PERMISIONARIO"
                        checked={promotorTipo === "PERMISIONARIO"}
                        onChange={() => setPromotorTipo("PERMISIONARIO")}
                      />{" "}
                      Permisionario
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="promotorTipo"
                        value="INSPECTOR"
                        checked={promotorTipo === "INSPECTOR"}
                        onChange={() => setPromotorTipo("INSPECTOR")}
                      />{" "}
                      Inspector
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="promotorTipo"
                        value="JEFE_MILITAR"
                        checked={promotorTipo === "JEFE_MILITAR"}
                        onChange={() => setPromotorTipo("JEFE_MILITAR")}
                      />{" "}
                      Jefe militar
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="promotorTipo"
                        value="OTROS"
                        checked={promotorTipo === "OTROS"}
                        onChange={() => setPromotorTipo("OTROS")}
                      />{" "}
                      Otros
                    </label>
                  </div>

                  <div style={infoGridStyle}>
                    <div>
                      <label style={fieldLabelStyle}>
                        Grado
                        <input
                          type="text"
                          value={promotorGrado}
                          onChange={(e) => setPromotorGrado(e.target.value)}
                          readOnly={promotorTipo === "PERMISIONARIO"}
                          style={
                            promotorTipo === "PERMISIONARIO"
                              ? readOnlyInputStyle
                              : inputStyle
                          }
                        />
                      </label>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>
                        Apellido y nombre
                        <input
                          type="text"
                          value={promotorNombre}
                          onChange={(e) => setPromotorNombre(e.target.value)}
                          readOnly={promotorTipo === "PERMISIONARIO"}
                          style={
                            promotorTipo === "PERMISIONARIO"
                              ? readOnlyInputStyle
                              : inputStyle
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <h4 style={{ ...sectionTitleStyle, fontSize: 16, marginBottom: 10 }}>
                  Solicito
                </h4>

                <div style={softCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      color: "#ffffff",
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={solCambio}
                        onChange={(e) => setSolCambio(e.target.checked)}
                      />{" "}
                      Cambio
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={solReparacion}
                        onChange={(e) => setSolReparacion(e.target.checked)}
                      />{" "}
                      Reparación
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={solVerificacion}
                        onChange={(e) => setSolVerificacion(e.target.checked)}
                      />{" "}
                      Verificación
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={solProvision}
                        onChange={(e) => setSolProvision(e.target.checked)}
                      />{" "}
                      Provisión
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={fieldLabelStyle}>
                  De:
                  <textarea
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 110,
                      fontFamily: "inherit",
                    }}
                    value={detalleDe}
                    onChange={(e) => setDetalleDe(e.target.value)}
                    placeholder="Ejemplo: rotura de mesada de cocina, pérdida de agua en cañería, filtración en techo, etc."
                  />
                </label>
              </div>

              <div style={{ marginTop: 18, maxWidth: 260 }}>
                <label style={fieldLabelStyle}>
                  Fecha de solicitud
                  <input
                    type="date"
                    value={fechaSolicitud}
                    onChange={(e) => setFechaSolicitud(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </div>

              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={enviarNuevoAnexo11}
                  disabled={enviando11}
                  style={successButtonStyle}
                >
                  {enviando11 ? "Enviando…" : "Enviar ANEXO 11 al Inspector"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Listado de anexos</h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenCodigoMenu((v) => !v)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    minWidth: 160,
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <span>{codigo}</span>
                  <span style={{ float: "right", opacity: 0.7 }}>▾</span>
                </button>

                {openCodigoMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      minWidth: 180,
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 12,
                      boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                      overflow: "hidden",
                      zIndex: 20,
                    }}
                  >
                    {CODIGOS.map((c) => {
                      const active = c === codigo;

                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCodigo(c);
                            setOpenCodigoMenu(false);
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "10px 12px",
                            border: "none",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: active ? "rgba(37,99,235,0.22)" : "#1e293b",
                            color: "#ffffff",
                            textAlign: "left",
                            cursor: "pointer",
                            fontWeight: active ? 700 : 500,
                          }}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <span style={{ color: "rgba(255,255,255,0.78)" }}>
                Resultados: <b>{visibles.length}</b>
              </span>
            </div>
          </div>

          {loading ? (
            <div style={softCardStyle}>
              <p style={{ margin: 0, color: "#ffffff" }}>Cargando…</p>
            </div>
          ) : visibles.length === 0 ? (
            <div style={softCardStyle}>
              <p style={{ margin: 0, color: "#ffffff" }}>No hay anexos.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {visibles.map((a) => (
                <div key={a._id} style={softCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff" }}>
                        {a.codigo}
                      </div>
                      <div style={metaStyle}>
                        Estado: {safe(a.estado)}
                        {a.estadoInstitucional ? ` / ${a.estadoInstitucional}` : ""}
                      </div>
                      <div style={metaStyle}>Fecha: {fmtDate(a.createdAt)}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        style={primaryButtonStyle}
                        onClick={() => navigate(`/app/permisionario/anexos/${a._id}`)}
                      >
                        Ver
                      </button>

                      <button
                        style={secondaryButtonStyle}
                        onClick={() => descargarPdf(a._id, a.codigo)}
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  </div>
);
}
