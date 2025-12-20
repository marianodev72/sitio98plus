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
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
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

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function GestionarAnexo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const role = up(user?.role);
  const esAdmin = role === "ADMIN_GENERAL" || role === "ADMIN";

  const historialInstitucional = useMemo(() => {
    const h = (anexo?.datos && anexo.datos._historialInstitucional) || [];
    return Array.isArray(h) ? h : [];
  }, [anexo]);

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await http.get(`/formularios/${id}`);
      setAnexo(res.data?.anexo || null);
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

  async function setEstadoInstitucional(estadoInstitucional: string) {
    if (!id) return;
    setBusy(true);
    setError(null);

    try {
      const res = await http.patch(
        `/formularios/${id}/estado-institucional`,
        {
          estadoInstitucional,
          motivo,
        }
      );
      setAnexo(res.data?.anexo || null);
      setMotivo("");
    } catch {
      setError(
        "No se ha podido procesar su solicitud, contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (error)
    return (
      <div style={{ padding: 24, color: "crimson" }}>{error}</div>
    );
  if (!anexo) return <div style={{ padding: 24 }}>Sin datos.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Gestionar</h2>

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
          <b>Institucional:</b> {anexo.estadoInstitucional || "—"}
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

        <button onClick={cargar}>Recargar</button>
      </div>

      {esAdmin && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Acciones (ADMIN_GENERAL)
          </h3>

          {up(anexo.codigo) === "ANEXO_01" ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <label>
                  Motivo / Observación (opcional)
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: Documentación incompleta, pasa a revisión…"
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  disabled={busy}
                  onClick={() =>
                    setEstadoInstitucional("EN_REVISION")
                  }
                >
                  Tomar en revisión
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    setEstadoInstitucional("APROBADA")
                  }
                >
                  Aprobar
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    setEstadoInstitucional("NO_APROBADA")
                  }
                >
                  No aprobar
                </button>
              </div>
            </>
          ) : (
            <p>
              Este anexo aún no tiene flujo de gestión
              configurado.
            </p>
          )}
        </div>
      )}

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
        <AnexoViewer
          codigo={anexo.codigo}
          datos={anexo.datos}
        />
      </div>

      {/* ADJUNTOS */}
      <h3>Adjuntos</h3>
      <AdjuntosList adjuntos={anexo.adjuntos || []} />

      {/* HISTORIAL INSTITUCIONAL */}
      <h3>Historial institucional</h3>
      {historialInstitucional.length > 0 ? (
        <ul>
          {historialInstitucional.map((h: any, idx: number) => (
            <li key={`${h.fecha || "h"}-${idx}`}>
              {fmtDate(h.fecha)} —{" "}
              <b>{h.estadoInstitucional}</b>
              {h.motivo ? ` — ${h.motivo}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin historial.</p>
      )}

      {/* HISTORIAL DE ESTADOS */}
      <h3>Historial de estados</h3>
      {Array.isArray(anexo.historialEstados) &&
      anexo.historialEstados.length > 0 ? (
        <ul>
          {anexo.historialEstados.map((h, idx) => (
            <li key={`${h.fecha || "e"}-${idx}`}>
              {fmtDate(h.fecha)} —{" "}
              {h.estadoAnterior || "?"} →{" "}
              <b>{h.estadoNuevo || "?"}</b>
              {h.observacion
                ? ` — ${h.observacion}`
                : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin historial.</p>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          onClick={() =>
            navigate("/app/admin-general/gestiones")
          }
        >
          Volver a: Gestiones
        </button>
      </div>
    </div>
  );
}
