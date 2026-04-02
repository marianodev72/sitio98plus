import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

  const pageStyle: CSSProperties = {
    padding: 24,
    color: "#E5E7EB",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const cardStyle: CSSProperties = {
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxSizing: "border-box",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const primaryButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: "rgba(59,130,246,0.20)",
    fontWeight: 800,
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    boxSizing: "border-box",
  };

  const errorStyle: CSSProperties = {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(127,29,29,0.18)",
    color: "#FCA5A5",
  };

  const okStyle: CSSProperties = {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(22,163,74,0.18)",
    color: "#86EFAC",
  };

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

  if (loading) return <div style={{ padding: 24, color: "#CBD5E1" }}>Cargando…</div>;

  if (!anexo) {
    return (
      <div style={pageStyle}>
        {errorMsg ? <p style={{ color: "#FCA5A5" }}>{errorMsg}</p> : <p>Sin datos.</p>}
        <button onClick={() => navigate(-1)} style={buttonStyle}>
          Volver
        </button>
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
    <div style={pageStyle}>
      <h2 style={{ marginTop: 0, color: "#F8FAFC" }}>ANEXO 04 — JEFE DE BARRIO</h2>

      {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
      {infoMsg && !errorMsg && <div style={okStyle}>{infoMsg}</div>}

      <section style={cardStyle}>
        <p style={{ marginTop: 0 }}>
          <b>Estado:</b> {safe(anexo.estado)}
          {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
        </p>
        <p style={{ marginBottom: 0 }}>
          <b>Fecha de inicio:</b> {fmtDate(anexo.createdAt)}
        </p>
      </section>

      <section style={{ marginBottom: 12 }}>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#93C5FD", textDecoration: "none", fontWeight: 700 }}
        >
          Descargar PDF
        </a>
      </section>

      <section style={{ marginBottom: 12 }}>
        <AnexoViewer anexo={anexo as any} />
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#F8FAFC" }}>
          Observaciones del JEFE (opcional)
        </h3>

        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={5}
          style={inputStyle}
          disabled={confOk}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate(-1)} disabled={busyObs || busyConf} style={buttonStyle}>
            Volver
          </button>

          <button
            onClick={guardarObservaciones}
            disabled={busyObs || busyConf || confOk}
            style={buttonStyle}
          >
            {busyObs ? "Guardando..." : "Guardar observaciones"}
          </button>

          <button
            onClick={darConformidad}
            disabled={busyObs || busyConf || confOk}
            style={primaryButtonStyle}
          >
            {confOk ? "Conformidad registrada" : busyConf ? "Registrando..." : "Dar conformidad"}
          </button>
        </div>

        {confOk && (
          <p style={{ marginTop: 10, fontSize: 13, color: "#CBD5E1" }}>
            Conformidad registrada: {fmtDate(d?.conformidadJefeBarrio?.fecha || null)}
          </p>
        )}
      </section>
    </div>
  );
}