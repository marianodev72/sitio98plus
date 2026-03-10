// frontend/src/pages/inspector/GestionarAnexoInspector.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import AnexoViewer from "../../components/anexos/AnexoViewer";
import AdjuntosList from "../../components/AdjuntosList";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
  usuario?: {
    _id?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    role?: string;
  };
  adjuntos?: Array<{
    nombre?: string;
    ruta?: string;
    tipo?: string;
    size?: number;
  }>;
  historialEstados?: Array<{
    fecha?: string;
    estadoAnterior?: string;
    estadoNuevo?: string;
    observacion?: string;
    realizadoPor?: string;
  }>;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function GestionarAnexoInspector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string>("");

  const [crearMsg, setCrearMsg] = useState<string>("");

  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos) ? user!.permisos.map(up) : [];
  const esInspectorLike = role === "INSPECTOR" || permisos.includes("INSPECTOR");

  const codigo = up(anexo?.codigo);
  const esAnexo02 = codigo === "ANEXO_02";
  const esAnexo03 = codigo === "ANEXO_03";

  const puedeIniciarAnexo03 =
    esInspectorLike &&
    esAnexo02 &&
    up(anexo?.estado) === "CERRADO" &&
    !!anexo?.datos?.viviendaId;

  const historialEstados = useMemo(
    () => (Array.isArray(anexo?.historialEstados) ? anexo!.historialEstados! : []),
    [anexo]
  );

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setInfoMsg("");
    setCrearMsg("");

    try {
      const res = await http.get(`/formularios/${id}`);
      const a = (res.data?.anexo || null) as Anexo | null;
      setAnexo(a);
    } catch {
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function iniciarAnexo03Desde02() {
    if (!anexo) return;
    setBusy(true);
    setCrearMsg("");
    setInfoMsg("");
    setError(null);

    try {
      const viviendaId = anexo.datos?.viviendaId;
      if (!viviendaId) {
        setCrearMsg(
          "No se ha podido procesar su solicitud, contacte al administrador."
        );
        setBusy(false);
        return;
      }

      const datos: any = {
        viviendaId,
        anexo02Id: anexo._id, // extra informativo, el backend hoy usa viviendaId y derivadoDe
      };

      const res = await http.post(`/formularios/ANEXO_03`, { datos });
      const creado = res.data?.anexo as Anexo | undefined;

      if (creado && creado._id) {
        // Mostramos directamente el ANEXO_03 recién creado en la misma pantalla
        setAnexo(creado);
        setInfoMsg("ANEXO_03 creado correctamente.");
        setCrearMsg("");
        return;
      }

      setCrearMsg(
        "No se ha podido procesar su solicitud, contacte al administrador."
      );
    } catch (e) {
      console.error("[INSPECTOR] Error creando ANEXO_03 desde ANEXO_02", e);
      setCrearMsg(
        "No se ha podido procesar su solicitud, contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!esInspectorLike) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al administrador.
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (error) return <div style={{ padding: 24, color: "crimson" }}>{error}</div>;
  if (!anexo) return <div style={{ padding: 24 }}>Sin datos.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Gestión de Anexo (Inspector)</h2>

      {infoMsg ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #ccc",
            background: "#f7f7f7",
          }}
        >
          {infoMsg}
        </div>
      ) : null}

      {crearMsg ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #ccc",
            background: "#f7f7f7",
          }}
        >
          {crearMsg}
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <div>
          <b>ID:</b> {anexo._id}
        </div>
        <div>
          <b>Código:</b> {anexo.codigo || "—"}
        </div>
        <div>
          <b>Estado:</b> {anexo.estado || "—"}
        </div>
        <div>
          <b>Creado:</b> {fmtDate(anexo.createdAt)}
        </div>
        <div>
          <b>Actualizado:</b> {fmtDate(anexo.updatedAt)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => navigate(-1)}>Volver</button>

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
      </div>

      {/* ─────────────────────────────
          BLOQUE: ANEXO_02 → crear ANEXO_03
         ───────────────────────────── */}
      {esAnexo02 ? (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <h3 style={{ marginTop: 0 }}>ANEXO_02 — Recepción / ANEXO_03</h3>

          <div
            style={{
              marginBottom: 10,
              padding: 10,
              border: "1px solid #eee",
              borderRadius: 8,
            }}
          >
            <div>
              <b>Estado ANEXO_02:</b> {safe(anexo.estado)}
            </div>
            <div>
              <b>Vivienda asociada:</b>{" "}
              {safe(anexo.datos?.viviendaCodigo || anexo.datos?.viviendaId)}
            </div>
          </div>

          <button
            disabled={busy || !puedeIniciarAnexo03}
            onClick={iniciarAnexo03Desde02}
            style={{ fontWeight: 700 }}
          >
            Iniciar ANEXO_03 (Acta de Recepción)
          </button>

          {!puedeIniciarAnexo03 ? (
            <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              El ANEXO_03 solo puede iniciarse cuando el ANEXO_02 está CERRADO y tiene
              vivienda asociada.
            </p>
          ) : (
            <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Al iniciar el ANEXO_03, se generará el acta de recepción de la vivienda
              asociada a este ANEXO_02, bajo su responsabilidad como Inspector.
            </p>
          )}
        </div>
      ) : null}

      {/* Aviso cuando ya estamos viendo un ANEXO_03 */}
      {esAnexo03 ? (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <h3 style={{ marginTop: 0 }}>ANEXO_03</h3>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
            Este es el acta de recepción de vivienda fiscal derivada de un ANEXO_02
            cerrado. Desde aquí podrá completar los datos de inspección y continuar con el
            circuito establecido.
          </p>
        </div>
      ) : null}

      {/* VISUALIZACIÓN */}
      <h3>Visualización del anexo</h3>
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginBottom: 18,
        }}
      >
        <AnexoViewer codigo={anexo.codigo} datos={anexo.datos} />
      </div>

      {/* ADJUNTOS */}
      <h3>Adjuntos</h3>
      <AdjuntosList formularioId={anexo._id} adjuntos={anexo.adjuntos || []} />

      {/* HISTORIAL DE ESTADOS */}
      <h3>Historial de estados</h3>
      {historialEstados.length > 0 ? (
        <ul>
          {historialEstados.map((h, idx) => (
            <li key={`${h.fecha || "e"}-${idx}`}>
              {fmtDate(h.fecha)} — {h.estadoAnterior || "?"} →{" "}
              <b>{h.estadoNuevo || "?"}</b>
              {h.observacion ? ` — ${h.observacion}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin historial.</p>
      )}
    </div>
  );
}
