// frontend/src/pages/postulante/VerAnexo.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import AnexoViewer from "../../components/anexos/AnexoViewer";
import AdjuntosList from "../../components/AdjuntosList";

type Conformidad = {
  ok?: boolean;
  fecha?: string;
  usuario?: string;
  observacion?: string;
};

type DatosAnexo = {
  [key: string]: any;
  postulanteId?: string;
  conformidadPermisionario?: Conformidad;
};

type AdjuntoMeta = {
  nombre?: string;
  ruta?: string;
  tipo?: string;
  size?: number;
};

type OrigenAdjuntos = {
  _id: string;
  codigo: string;
  adjuntos: AdjuntoMeta[];
};

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: DatosAnexo;
  adjuntos?: AdjuntoMeta[];
  conformidadPostulante?: Conformidad | null;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function VerAnexo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [origen, setOrigen] = useState<OrigenAdjuntos | null>(null);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [mostrarPreview, setMostrarPreview] = useState(true);

  // ✅ Preview PDF autenticado (evita 403 por abrir <a> sin Authorization)
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const codigo = useMemo(() => up(anexo?.codigo), [anexo?.codigo]);
  const estado = useMemo(() => up(anexo?.estado), [anexo?.estado]);

  const isAnexo01 = codigo === "ANEXO_01";
  const isAnexo02 = codigo === "ANEXO_02";
  const isAnexo03 = codigo === "ANEXO_03";

  const conformidadPostulanteOk = Boolean(anexo?.conformidadPostulante?.ok);
  const conformidadPermisionarioOk = Boolean(
    anexo?.datos?.conformidadPermisionario?.ok
  );

  // ANEXO_02 – botón para POSTULANTE
  const puedeDarConformidad02 =
    role === "POSTULANTE" &&
    isAnexo02 &&
    !conformidadPostulanteOk &&
    estado === "ENVIADO";

  // ANEXO_03 – botón para conformidad PERMISIONARIO
  // ⚠️ NO filtramos por rol aquí: el backend valida que el usuario sea el titular (postulanteId).
  const puedeDarConformidad03 =
    isAnexo03 && !conformidadPermisionarioOk && estado === "ENVIADO";

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await http.get(`/formularios/${id}`);
      setAnexo(res.data?.anexo || null);
      setOrigen(res.data?.origen || null);
    } catch (e) {
      console.error("[VER ANEXO] Error", e);
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
      setAnexo(null);
      setOrigen(null);
    } finally {
      setLoading(false);
    }
  }

  async function cargarPdfPreview() {
  if (!id) return;

  // liberar anterior si existe
  setPdfObjectUrl((prev) => {
    if (prev) URL.revokeObjectURL(prev);
    return null;
  });

  setPdfLoading(true);
  try {
    console.log("BASE URL:", http.defaults?.baseURL);
    console.log("REQUESTING:", `/formularios/${id}/pdf`);

    const res = await http.get(`/formularios/${id}/pdf`, {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfObjectUrl(url);
  } catch (e) {
    console.error("[VER ANEXO] Error preview PDF", e);
    setPdfObjectUrl(null);
  } finally {
    setPdfLoading(false);
  }
}

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // cada vez que cambia el id, recargar preview autenticado
    cargarPdfPreview();

    return () => {
      setPdfObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Seguridad básica: solo estos roles pueden usar esta vista
  if (
    role !== "POSTULANTE" &&
    role !== "PERMISIONARIO" &&
    role !== "INSPECTOR"
  ) {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  if (error)
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate(-1)}>Volver</button>
        </div>
      </div>
    );

  if (!anexo)
    return (
      <div style={{ padding: 24 }}>
        <p>Sin datos.</p>
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>
    );

  async function darConformidad02() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await http.post(`/formularios/${id}/conformidad`);
      setAnexo(res.data?.anexo || null);
      setInfoMsg(
        "Conformidad registrada correctamente. El trámite pasa a revisión de ADMIN GENERAL."
      );
      // refrescar preview (puede cambiar el contenido del PDF/estado)
      cargarPdfPreview();
    } catch (e) {
      console.error("[VER ANEXO] Error conformidad ANEXO_02", e);
      setError("No se ha podido procesar su solicitud, contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

  async function darConformidad03() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await http.post(`/formularios/${id}/conformidad-permisionario`);
      setAnexo(res.data?.anexo || null);
      setInfoMsg(
        "Conformidad registrada correctamente. El trámite pasa a revisión de ADMIN GENERAL."
      );
      cargarPdfPreview();
    } catch (e) {
      console.error("[VER ANEXO] Error conformidad ANEXO_03", e);
      setError("No se ha podido procesar su solicitud, contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

  // Adjuntos para mostrar:
  // - ANEXO_01: usa adjuntos propios
  // - ANEXO_02: mostrar adjuntos del ANEXO_01 origen (metadata)
  const adjuntosParaMostrar: AdjuntoMeta[] = isAnexo02
    ? origen?.adjuntos || []
    : anexo.adjuntos || [];

  const tituloAdjuntos = isAnexo02 ? "Adjuntos (ANEXO_01 vinculado)" : "Adjuntos";

  return (
    <div style={{ padding: 24 }}>
      <h2>Anexo</h2>

      <div style={{ marginBottom: 12 }}>
        <div>
          <b>ID:</b> {anexo._id}
        </div>
        <div>
          <b>Código:</b> {anexo.codigo || "—"}
        </div>
        <div>
          <b>Estado:</b> {anexo.estado || "—"}
          {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
        </div>
        <div>
          <b>Creado:</b> {fmtDate(anexo.createdAt)}
        </div>
        <div>
          <b>Actualizado:</b> {fmtDate(anexo.updatedAt)}
        </div>

        {isAnexo02 && (
          <div style={{ marginTop: 4, fontSize: 13 }}>
            <b>Conformidad postulante:</b> {conformidadPostulanteOk ? "SI" : "NO"}
          </div>
        )}

        {isAnexo03 && (
          <div style={{ marginTop: 4, fontSize: 13 }}>
            <b>Conformidad permisionario:</b>{" "}
            {conformidadPermisionarioOk ? "SI" : "NO"}
          </div>
        )}

        {isAnexo02 && origen?._id && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <b>Origen:</b> {origen.codigo} / {origen._id}
          </div>
        )}

        {isAnexo01 && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <b>Adjuntos:</b> {String((anexo.adjuntos || []).length)}
          </div>
        )}
      </div>

      {/* DEBUG */}
      <div
        style={{
          marginBottom: 12,
          padding: 8,
          border: "1px dashed #bbb",
          background: "#f9f9f9",
          fontSize: 11,
        }}
      >
        <div>
          <b>DEBUG</b>
        </div>
        <div>role = {role}</div>
        <div>codigo = {codigo}</div>
        <div>estado = {safe(anexo.estado)}</div>
        <div>origen = {origen?._id ? "SI" : "NO"}</div>
        <div>origen.adjuntos = {String(origen?.adjuntos?.length || 0)}</div>
        <div>adjuntosParaMostrar = {String(adjuntosParaMostrar.length)}</div>
        <div>pdfLoading = {String(pdfLoading)}</div>
        <div>pdfObjectUrl = {pdfObjectUrl ? "SI" : "NO"}</div>
        <div>conformidadPostulanteOk = {String(conformidadPostulanteOk)}</div>
        <div>conformidadPermisionarioOk = {String(conformidadPermisionarioOk)}</div>
        <div>puedeDarConformidad02 = {String(puedeDarConformidad02)}</div>
        <div>puedeDarConformidad03 = {String(puedeDarConformidad03)}</div>
      </div>

      {infoMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #4caf50",
            background: "#e8f5e9",
            fontSize: 13,
          }}
        >
          {infoMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid crimson",
            background: "#ffe6e6",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => navigate(-1)} disabled={busy}>
          Volver
        </button>

        {/* ✅ abrir en pestaña usando el objectURL autenticado */}
        <button
          type="button"
          onClick={() => {
            if (pdfObjectUrl) window.open(pdfObjectUrl, "_blank", "noopener,noreferrer");
          }}
          disabled={busy || !pdfObjectUrl}
          title={!pdfObjectUrl ? "Previsualización no disponible" : "Abrir PDF"}
        >
          Abrir PDF
        </button>

        <button
          type="button"
          onClick={() => {
            cargar();
            cargarPdfPreview();
          }}
          disabled={busy}
        >
          Recargar
        </button>

        <button
          type="button"
          onClick={() => setMostrarPreview((x) => !x)}
          disabled={busy}
        >
          {mostrarPreview ? "Ver datos crudos" : "Previsualizar"}
        </button>

        {puedeDarConformidad02 && (
          <button
            onClick={darConformidad02}
            disabled={busy}
            style={{ fontWeight: 700 }}
          >
            Dar conformidad (ANEXO 02)
          </button>
        )}

        {puedeDarConformidad03 && (
          <button
            onClick={darConformidad03}
            disabled={busy}
            style={{ fontWeight: 700 }}
          >
            Dar conformidad (ANEXO 03)
          </button>
        )}
      </div>

      {/* ✅ PDF embebido autenticado */}
      <h3>PDF (previsualización)</h3>
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 18,
        }}
      >
        {pdfLoading ? (
          <div style={{ padding: 12, fontSize: 13 }}>Cargando PDF…</div>
        ) : pdfObjectUrl ? (
          <iframe
            title="pdf-preview"
            src={pdfObjectUrl}
            style={{ width: "100%", height: 720, border: "none" }}
          />
        ) : (
          <div style={{ padding: 12, fontSize: 13 }}>
            No se pudo cargar la previsualización del PDF.
          </div>
        )}
      </div>

      <h3>Visualización del anexo</h3>
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginBottom: 18,
        }}
      >
        {mostrarPreview ? (
          <AnexoViewer codigo={anexo.codigo} datos={anexo.datos} />
        ) : (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              background: "#f7f7f7",
              padding: 8,
              borderRadius: 6,
            }}
          >
            {JSON.stringify(anexo.datos, null, 2)}
          </pre>
        )}
      </div>

      <h3>{tituloAdjuntos}</h3>
      <AdjuntosList formularioId={anexo._id} adjuntos={adjuntosParaMostrar} />

      {isAnexo02 && !origen?._id && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
          Nota: este ANEXO_02 no tiene un ANEXO_01 vinculado (derivadoDe) o no está disponible.
        </div>
      )}

      {/* Info institucional opcional */}
      {isAnexo01 && (anexo.adjuntos || []).length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
          Nota: este ANEXO_01 no registra adjuntos.
        </div>
      )}
    </div>
  );
}
