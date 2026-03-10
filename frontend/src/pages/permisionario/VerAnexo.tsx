// frontend/src/pages/postulante/VerAnexo.tsx
import { useEffect, useState } from "react";
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

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: DatosAnexo;
  adjuntos?: Array<{
    nombre?: string;
    ruta?: string;
    tipo?: string;
    size?: number;
  }>;
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
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [mostrarPreview, setMostrarPreview] = useState(true);

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await http.get(`/formularios/${id}`);
      setAnexo(res.data?.anexo || null);
    } catch (e) {
      console.error("[VER ANEXO] Error", e);
      setError("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setAnexo(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Seguridad básica: solo estos roles pueden usar esta vista
  if (role !== "POSTULANTE" && role !== "PERMISIONARIO" && role !== "INSPECTOR") {
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

  const codigo = up(anexo.codigo);
  const estado = up(anexo.estado);

  const isAnexo02 = codigo === "ANEXO_02";
  const isAnexo03 = codigo === "ANEXO_03";

  const conformidadPostulanteOk = Boolean(anexo.conformidadPostulante?.ok);
  const conformidadPermisionarioOk = Boolean(anexo.datos?.conformidadPermisionario?.ok);

  // ANEXO_02 – botón para POSTULANTE
  const puedeDarConformidad02 =
    role === "POSTULANTE" &&
    isAnexo02 &&
    !conformidadPostulanteOk &&
    estado === "ENVIADO";

  // ANEXO_03 – botón para conformidad PERMISIONARIO
  // ⚠️ NO filtramos por rol aquí: el backend valida que el usuario sea el titular (postulanteId).
  const puedeDarConformidad03 =
    isAnexo03 &&
    !conformidadPermisionarioOk &&
    estado === "ENVIADO";

  async function darConformidad02() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await http.post(`/formularios/${id}/conformidad`);
      setAnexo(res.data?.anexo || null);
      setInfoMsg("Conformidad registrada correctamente. El trámite pasa a revisión de ADMIN GENERAL.");
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
    } catch (e) {
      console.error("[VER ANEXO] Error conformidad ANEXO_03", e);
      setError("No se ha podido procesar su solicitud, contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

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
            <b>Conformidad permisionario:</b> {conformidadPermisionarioOk ? "SI" : "NO"}
          </div>
        )}
      </div>

      {/* DEBUG: ayuda a ver por qué se pinta o no el botón */}
      <div
        style={{
          marginBottom: 12,
          padding: 8,
          border: "1px dashed #bbb",
          background: "#f9f9f9",
          fontSize: 11,
        }}
      >
        <div><b>DEBUG</b></div>
        <div>role = {role}</div>
        <div>codigo = {codigo}</div>
        <div>estado = {safe(anexo.estado)}</div>
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

        <a
          href={`http://localhost:3000/api/formularios/${anexo._id}/pdf`}
          target="_blank"
          rel="noreferrer"
        >
          PDF
        </a>

        <button onClick={cargar} disabled={busy}>
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

      <h3>Adjuntos</h3>
      <AdjuntosList formularioId={anexo._id} adjuntos={anexo.adjuntos || []} />
    </div>
  );
}
