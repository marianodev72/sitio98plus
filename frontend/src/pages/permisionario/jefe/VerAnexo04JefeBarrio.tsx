import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";
import AnexoViewer from "../../../components/anexos/AnexoViewer";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  datos?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  const u = list.map((x: any) => String(x || "").toUpperCase().trim());
  return u.includes(String(perm || "").toUpperCase().trim());
}

export default function VerAnexo04JefeBarrio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [busyObs, setBusyObs] = useState(false);
  const [busyConf, setBusyConf] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  const puedeUsar = useMemo(() => {
    return up(user?.role) === "PERMISIONARIO" && hasPerm(user, "JEFE_DE_BARRIO");
  }, [user]);

  useEffect(() => {
    if (!id) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const res = await http.get(`/formularios/${id}`);
      const a = res.data?.anexo || null;
      if (!a) {
        setErrorMsg("La página solicitada no está disponible.");
        setAnexo(null);
      } else {
        setAnexo(a);
        const d = a.datos || {};
        setObservaciones(String(d.observacionesJefeBarrio || "").trim());
      }
    } catch (e) {
      console.error("[VER ANEXO 04 JEFE]", e);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setAnexo(null);
    } finally {
      setLoading(false);
    }
  }

  async function guardarObservaciones() {
    if (!anexo?._id) return;
    setBusyObs(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      await http.patch(`/formularios/${anexo._id}/anexo-04/observaciones`, {
        datos: { observacionesJefeBarrio: observaciones },
      });
      setInfoMsg("Observaciones guardadas.");
      await cargar();
    } catch (e: any) {
      console.error("[ANEXO_04] Error guardando observaciones", e);
      setErrorMsg(
        e?.response?.data?.message ||
          "No se pudo procesar su solicitud. Por favor, contacte al administrador."
      );
    } finally {
      setBusyObs(false);
    }
  }

  async function darConformidad() {
    if (!anexo?._id) return;
    setBusyConf(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      await http.post(`/formularios/${anexo._id}/conformidad-jefe-04`, {
        observacion: observaciones,
      });
      setInfoMsg("Conformidad registrada correctamente.");
      await cargar();
    } catch (e: any) {
      console.error("[ANEXO_04] Error registrando conformidad", e);
      setErrorMsg(
        e?.response?.data?.message ||
          "No se pudo procesar su solicitud. Por favor, contacte al administrador."
      );
    } finally {
      setBusyConf(false);
    }
  }

  if (!puedeUsar) {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  if (!anexo) {
    return (
      <div style={{ padding: 24 }}>
        {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : <p>Sin datos.</p>}
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  const codigo = up(anexo.codigo);
  if (codigo !== "ANEXO_04") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const d = anexo.datos || {};
  const pdfUrl = `/api/formularios/${anexo._id}/pdf`;

  const confOk = Boolean(d?.conformidadJefeBarrio?.ok);

  return (
    <div style={{ padding: 24 }}>
      <h2>ANEXO 04 — JEFE DE BARRIO</h2>

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

      <section
        style={{
          marginTop: 12,
          marginBottom: 12,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <p>
          <b>Estado:</b> {safe(anexo.estado)}
          {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
        </p>
        <p>
          <b>Fecha de inicio:</b> {fmtDate(anexo.createdAt)}
        </p>
      </section>

      <section style={{ marginBottom: 12 }}>
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          Descargar PDF
        </a>
      </section>

      <section style={{ marginBottom: 12 }}>
        <AnexoViewer anexo={anexo as any} />
      </section>

      <section
        style={{
          marginTop: 12,
          marginBottom: 12,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Observaciones del JEFE (opcional)</h3>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: 8 }}
          disabled={confOk}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button onClick={() => navigate(-1)} disabled={busyObs || busyConf}>
            Volver
          </button>

          <button onClick={guardarObservaciones} disabled={busyObs || busyConf || confOk}>
            {busyObs ? "Guardando..." : "Guardar observaciones"}
          </button>

          <button onClick={darConformidad} disabled={busyObs || busyConf || confOk}>
            {confOk ? "Conformidad registrada" : busyConf ? "Registrando..." : "Dar conformidad"}
          </button>
        </div>

        {confOk && (
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
            Conformidad registrada: {fmtDate(d?.conformidadJefeBarrio?.fecha || null)}
          </p>
        )}
      </section>
    </div>
  );
}
