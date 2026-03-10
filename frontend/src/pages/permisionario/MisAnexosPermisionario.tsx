//frontend/src/pages/permisionario/MisAnexosPermisionario.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
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
    "ANEXO_11",
  ];
  const [codigo, setCodigo] = useState("TODOS");

  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // UI para iniciar ANEXO 11 con formulario institucional
  const [mostrandoNuevo11, setMostrandoNuevo11] = useState(false);
  const [enviando11, setEnviando11] = useState(false);

  // Campos institucionales básicos del ANEXO 11 (Permisionario / Promotor / Solicito)
  const [unidad, setUnidad] = useState("");
  const [dpto, setDpto] = useState("");
  const [mb, setMb] = useState("");
  const [mz, setMz] = useState("");
  const [casa, setCasa] = useState("");

  const [permGrado, setPermGrado] = useState("");
  const [permNombre, setPermNombre] = useState(
    `${safe(user?.apellido)} ${safe(user?.nombre)}`
      .replace(/^-\s*-$/, "")
      .trim()
  );

  const [promotorTipo, setPromotorTipo] = useState<
    "PERMISIONARIO" | "INSPECTOR" | "JEFE_MILITAR" | "OTROS"
  >("PERMISIONARIO");
  const [promotorGrado, setPromotorGrado] = useState("");
  const [promotorNombre, setPromotorNombre] = useState(
    `${safe(user?.apellido)} ${safe(user?.nombre)}`
      .replace(/^-\s*-$/, "")
      .trim()
  );

  const [solCambio, setSolCambio] = useState(false);
  const [solReparacion, setSolReparacion] = useState(true); // caso típico
  const [solVerificacion, setSolVerificacion] = useState(false);
  const [solProvision, setSolProvision] = useState(false);

  const [detalleDe, setDetalleDe] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  });

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

  // ENVIAR ANEXO 11 (permisionario → inspector)
  async function enviarNuevoAnexo11() {
    if (!detalleDe.trim()) {
      setErrorMsg("Completá el campo 'DE:' describiendo el pedido de trabajo.");
      return;
    }

    if (!solCambio && !solReparacion && !solVerificacion && !solProvision) {
      setErrorMsg(
        "Marcá al menos una opción en 'SOLICITO: CAMBIO / REPARACIÓN / VERIFICACIÓN / PROVISIÓN'."
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

      // compatibilidad: muchos reportes esperan un campo genérico
      datos.detallePedido = datos.solicitudDetalle;

      const res = await http.post("/formularios/ANEXO_11", { datos });
      const creado = res.data?.anexo || res.data?.formulario || null;

      if (creado?._id) {
        setInfoMsg(
          "ANEXO 11 creado y enviado al Inspector correctamente. Podrás seguir su estado en el listado."
        );
        setMostrandoNuevo11(false);
        setDetalleDe("");
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

  return (
    <div>
      <h2>Mis anexos</h2>

      {errorMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #f44336",
            background: "#ffebee",
          }}
        >
          {errorMsg}
        </div>
      )}

      {infoMsg && !errorMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #4caf50",
            background: "#e8f5e9",
          }}
        >
          {infoMsg}
        </div>
      )}

      
{/* Bloque para iniciar ANEXO 04 (trámite personal) */}
<section
  style={{
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#f5f5f5",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    }}
  >
    <h3 style={{ margin: 0 }}>
      ANEXO 04 – Aviso de ausencia prolongada
    </h3>

    <button
      type="button"
      onClick={() => navigate("/app/permisionario/anexo-04/nuevo")}
      style={{ fontWeight: 700 }}
    >
      Crear ANEXO 04
    </button>
  </div>

  <p style={{ fontSize: 13, marginTop: 10 }}>
    Este trámite es personal del Permisionario. Se inicia desde el panel base y se
    remite a JEFE DE BARRIO (con copia institucional a INSPECTOR, ADMIN y ADMIN_GENERAL).
  </p>
</section>

      {/* Bloque para iniciar ANEXO 11 (formulario institucional) */}
      <section
        style={{
          marginBottom: 16,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#f5f5f5",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>
            ANEXO 11 – Formulario de Pedido de Trabajo
          </h3>
          <button
            type="button"
            onClick={() => setMostrandoNuevo11((v) => !v)}
          >
            {mostrandoNuevo11
              ? "Cerrar formulario"
              : "Iniciar ANEXO 11 – Pedido de Trabajo"}
          </button>
        </div>

        {mostrandoNuevo11 && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #ccc",
            }}
          >
            <p style={{ fontSize: 13 }}>
              Completá los datos del formulario institucional. Este pedido se
              enviará al Inspector para su gestión y seguimiento.
            </p>

            {/* UNIDAD / DPTO / MB / MZ / CASA */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ flex: "1 1 140px" }}>
                <label>
                  <b>Unidad:</b>
                  <br />
                  <input
                    type="text"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label>
                  <b>Dpto.:</b>
                  <br />
                  <input
                    type="text"
                    value={dpto}
                    onChange={(e) => setDpto(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
              <div style={{ flex: "0 0 90px" }}>
                <label>
                  <b>MB:</b>
                  <br />
                  <input
                    type="text"
                    value={mb}
                    onChange={(e) => setMb(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
              <div style={{ flex: "0 0 90px" }}>
                <label>
                  <b>MZ:</b>
                  <br />
                  <input
                    type="text"
                    value={mz}
                    onChange={(e) => setMz(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <label>
                  <b>Casa:</b>
                  <br />
                  <input
                    type="text"
                    value={casa}
                    onChange={(e) => setCasa(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
            </div>

            {/* PERMISIONARIO */}
            <div style={{ marginBottom: 8 }}>
              <b>Permisionario</b>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <div style={{ flex: "0 0 160px" }}>
                  <label>
                    Grado:
                    <br />
                    <input
                      type="text"
                      value={permGrado}
                      onChange={(e) => setPermGrado(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
                <div style={{ flex: "1 1 260px" }}>
                  <label>
                    Apellido y nombre:
                    <br />
                    <input
                      type="text"
                      value={permNombre}
                      onChange={(e) => setPermNombre(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* PROMOTOR */}
            <div style={{ marginBottom: 8 }}>
              <b>Promotor</b>
              <div style={{ marginTop: 4 }}>
                <label style={{ marginRight: 8 }}>
                  <input
                    type="radio"
                    name="promotorTipo"
                    value="PERMISIONARIO"
                    checked={promotorTipo === "PERMISIONARIO"}
                    onChange={() => setPromotorTipo("PERMISIONARIO")}
                  />{" "}
                  Permisionario
                </label>
                <label style={{ marginRight: 8 }}>
                  <input
                    type="radio"
                    name="promotorTipo"
                    value="INSPECTOR"
                    checked={promotorTipo === "INSPECTOR"}
                    onChange={() => setPromotorTipo("INSPECTOR")}
                  />{" "}
                  Inspector
                </label>
                <label style={{ marginRight: 8 }}>
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

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <div style={{ flex: "0 0 160px" }}>
                  <label>
                    Grado:
                    <br />
                    <input
                      type="text"
                      value={promotorGrado}
                      onChange={(e) => setPromotorGrado(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
                <div style={{ flex: "1 1 260px" }}>
                  <label>
                    Apellido y nombre:
                    <br />
                    <input
                      type="text"
                      value={promotorNombre}
                      onChange={(e) => setPromotorNombre(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* SOLICITO CAMBIO / REPARACIÓN / VERIFICACIÓN / PROVISIÓN */}
            <div style={{ marginBottom: 8 }}>
              <b>Solicito</b>
              <div style={{ marginTop: 4 }}>
                <label style={{ marginRight: 8 }}>
                  <input
                    type="checkbox"
                    checked={solCambio}
                    onChange={(e) => setSolCambio(e.target.checked)}
                  />{" "}
                  Cambio
                </label>
                <label style={{ marginRight: 8 }}>
                  <input
                    type="checkbox"
                    checked={solReparacion}
                    onChange={(e) => setSolReparacion(e.target.checked)}
                  />{" "}
                  Reparación
                </label>
                <label style={{ marginRight: 8 }}>
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

            {/* DE: (detalle) */}
            <div style={{ marginBottom: 8 }}>
              <label>
                <b>De:</b>
                <br />
                <textarea
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    padding: 6,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                  value={detalleDe}
                  onChange={(e) => setDetalleDe(e.target.value)}
                  placeholder="Ejemplo: rotura de mesada de cocina, pérdida de agua en cañería, filtración en techo, etc."
                />
              </label>
            </div>

            {/* Fecha de solicitud */}
            <div style={{ marginBottom: 8 }}>
              <label>
                <b>Fecha de solicitud:</b>
                <br />
                <input
                  type="date"
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                />
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={enviarNuevoAnexo11}
                disabled={enviando11}
                style={{ fontWeight: 700 }}
              >
                Enviar ANEXO 11 al Inspector
              </button>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 12 }}>
        <select value={codigo} onChange={(e) => setCodigo(e.target.value)}>
          {CODIGOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span style={{ marginLeft: 12 }}>Resultados: {visibles.length}</span>
      </section>

      {loading ? (
        <p>Cargando…</p>
      ) : visibles.length === 0 ? (
        <p>No hay anexos.</p>
      ) : (
        <table border={1} cellPadding={6} width="100%">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a._id}>
                <td>{a.codigo}</td>
                <td>
                  {safe(a.estado)}
                  {a.estadoInstitucional ? ` / ${a.estadoInstitucional}` : ""}
                </td>
                <td>{fmtDate(a.createdAt)}</td>
                <td>
                  <button
                    onClick={() =>
                      navigate(`/app/permisionario/anexos/${a._id}`)
                    }
                  >
                    Ver
                  </button>{" "}
                  <button onClick={() => descargarPdf(a._id, a.codigo)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
