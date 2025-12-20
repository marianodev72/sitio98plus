// frontend/src/pages/admin_general/GestionarAnexo.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  usuario?: any;
  datos?: any;
};

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}`;
}

// yyyy-mm-dd (para input type="date")
function toDateInputValue(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function GestionarAnexo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const myRole = up(user?.role);
  const cod = up(anexo?.codigo);
  const est = up(anexo?.estado);

  // ✅ Campos editables para cierre ADMIN_GENERAL de ANEXO_02
  const [fechaAsignacion, setFechaAsignacion] = useState<string>("");
  const [fechaEntrega, setFechaEntrega] = useState<string>("");

  // ─────────────────────────────
  async function cargar() {
    if (!id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get(`/formularios/${id}`);
      const a = res.data?.anexo || null;
      setAnexo(a);

      // si ya existieran guardados, precargamos
      const fa = String(a?.datos?.fechaAsignacion || "").trim();
      const fe = String(a?.datos?.fechaEntrega || "").trim();

      // si vienen como ISO u otro, tratamos de normalizarlos
      setFechaAsignacion(fa && fa.includes("-") ? fa.slice(0, 10) : fa);
      setFechaEntrega(fe && fe.includes("-") ? fe.slice(0, 10) : fe);
    } catch (err) {
      console.error("[GESTIONAR] Error cargando", err);
      setAnexo(null);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function descargarPdf() {
    if (!anexo) return;

    setBusy(true);
    setErrorMsg("");

    try {
      const res = await http.get(`/formularios/${anexo._id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_${up(anexo.codigo)}_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[GESTIONAR] Error PDF", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────
  // Acciones institucionales por rol/estado/código
  const accion = useMemo(() => {
    // ANEXO_02: POSTULANTE conformidad cuando está ENVIADO
    if (cod === "ANEXO_02" && myRole === "POSTULANTE" && est === "ENVIADO") return "CONFORMIDAD_POSTULANTE_02";

    // ANEXO_02: ADMIN_GENERAL cierre cuando está EN_REVISION
    if (cod === "ANEXO_02" && myRole === "ADMIN_GENERAL" && est === "EN_REVISION") return "CIERRE_ADMIN_02";

    // ANEXO_03: PERMISIONARIO conformidad cuando está ENVIADO
    if (cod === "ANEXO_03" && myRole === "PERMISIONARIO" && est === "ENVIADO") return "CONFORMIDAD_PERM_03";

    // ANEXO_03: ADMIN_GENERAL cierre cuando está EN_REVISION
    if (cod === "ANEXO_03" && myRole === "ADMIN_GENERAL" && est === "EN_REVISION") return "CIERRE_ADMIN_03";

    return null;
  }, [cod, est, myRole]);

  function labelAccion(kind: string) {
    switch (kind) {
      case "CONFORMIDAD_POSTULANTE_02":
        return "Dar conformidad (Postulante)";
      case "CIERRE_ADMIN_02":
        return "Cerrar trámite (Admin. Gral.)";
      case "CONFORMIDAD_PERM_03":
        return "Dar conformidad (Permisionario)";
      case "CIERRE_ADMIN_03":
        return "Cerrar trámite (Admin. Gral.)";
      default:
        return "Acción";
    }
  }

  async function ejecutarAccion() {
    if (!anexo || !accion) return;

    setBusy(true);
    setErrorMsg("");

    try {
      if (accion === "CONFORMIDAD_POSTULANTE_02") {
        await http.post(`/formularios/${anexo._id}/conformidad`);
      } else if (accion === "CIERRE_ADMIN_02") {
        // ✅ Enviamos fechas (backend puede persistirlas en anexo.datos)
        await http.post(`/formularios/${anexo._id}/conformidad-admin`, {
          datos: {
            fechaAsignacion: fechaAsignacion || null,
            fechaEntrega: fechaEntrega || null,
          },
        });
      } else if (accion === "CONFORMIDAD_PERM_03") {
        await http.post(`/formularios/${anexo._id}/conformidad-permisionario`);
      } else if (accion === "CIERRE_ADMIN_03") {
        await http.post(`/formularios/${anexo._id}/cierre-admin-general`);
      }

      await cargar();
    } catch (err) {
      console.error("[GESTIONAR] Error acción", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────
  // INSPECTOR: iniciar ANEXO_03 desde ANEXO_02 cerrado
  const canIniciarAnexo03 =
    myRole === "INSPECTOR" &&
    cod === "ANEXO_02" &&
    est === "CERRADO" &&
    !!String(anexo?.datos?.viviendaId || "").trim();

  async function iniciarAnexo03() {
    if (!anexo) return;

    const viviendaId = String(anexo.datos?.viviendaId || "").trim();
    if (!viviendaId) {
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
      return;
    }

    const ok = window.confirm("Confirmar inicio de Toma de Vivienda (ANEXO_03). ¿Continuar?");
    if (!ok) return;

    setBusy(true);
    setErrorMsg("");

    try {
      const payload = { datos: { viviendaId } };
      const res = await http.post(`/formularios/ANEXO_03`, payload);
      const nuevo = res.data?.anexo;

      if (nuevo?._id) {
        navigate(`/app/admin-general/gestiones/${nuevo._id}`);
      } else {
        await cargar();
      }
    } catch (err) {
      console.error("[GESTIONAR] Error iniciando ANEXO_03", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────────

  if (loading) return <p>Cargando…</p>;

  if (!anexo) {
    return (
      <div>
        <h1>Gestionar Anexo</h1>
        <p>Detalle no disponible.</p>
        <button onClick={() => navigate("/app/admin-general/gestiones")}>Volver</button>
      </div>
    );
  }

  return (
    <>
      <h1>Gestionar Anexo</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => navigate("/app/admin-general/gestiones")}>← Volver a Gestiones</button>
      </div>

      {errorMsg ? (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #ccc", background: "#f7f7f7" }}>
          {errorMsg}
        </div>
      ) : null}

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <div>
          <strong>{safe(anexo.codigo)}</strong> — Estado: <strong>{safe(anexo.estado)}</strong>
          {anexo.estadoInstitucional ? <> — Inst.: <strong>{safe(anexo.estadoInstitucional)}</strong></> : null}
        </div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          <div>Creado: {fmtDate(anexo.createdAt)}</div>
          <div>Actualizado: {fmtDate(anexo.updatedAt)}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button disabled={busy} onClick={descargarPdf}>
            Descargar PDF
          </button>

          {accion ? (
            <button disabled={busy} onClick={ejecutarAccion}>
              {labelAccion(accion)}
            </button>
          ) : null}

          {canIniciarAnexo03 ? (
            <button disabled={busy} onClick={iniciarAnexo03}>
              Iniciar Toma (ANEXO_03)
            </button>
          ) : null}
        </div>
      </section>

      {/* ✅ ANEXO_02: fechas solo para ADMIN_GENERAL cuando está EN_REVISION */}
      {cod === "ANEXO_02" && myRole === "ADMIN_GENERAL" && est === "EN_REVISION" ? (
        <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Datos administrativos (Admin. Gral.)</h3>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Fecha de Asignación</span>
              <input
                type="date"
                value={fechaAsignacion}
                onChange={(e) => setFechaAsignacion(e.target.value)}
                disabled={busy}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Fecha de Entrega</span>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
            Estas fechas se envían al cierre del trámite.
          </p>
        </section>
      ) : null}

      {/* JSON institucional */}
      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Datos</h3>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 0 }}>
          {JSON.stringify(anexo.datos || {}, null, 2)}
        </pre>
      </section>
    </>
  );
}
