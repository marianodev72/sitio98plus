import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useAuthStore } from "../../store/authStore";

type EstadoAnexo =
  | "ENVIADO"
  | "CONFORMADO_POSTULANTE"
  | "CERRADO"
  | string;

interface Anexo {
  _id: string;
  codigo: string;
  estado: EstadoAnexo;
  createdAt: string;
  datos?: {
    viviendaId?: string;
    [key: string]: any;
  };
}

export default function PostulanteAnexosPage() {
  const { user } = useAuthStore();

  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccion, setLoadingAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Cargar MIS anexos (POSTULANTE)
  // ─────────────────────────────────────────────
  async function loadAnexos() {
    try {
      setLoading(true);
      setError(null);

      const resp = await apiClient.get("/formularios/mios");

      const lista: Anexo[] = Array.isArray(resp.data?.anexos)
        ? resp.data.anexos
        : [];

      // Nos quedamos solo con ANEXO_02
      setAnexos(lista.filter((a) => a.codigo === "ANEXO_02"));
    } catch (err) {
      console.error("[PostulanteAnexos] Error:", err);
      setError("No se pudieron cargar sus trámites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnexos();
  }, []);

  // ─────────────────────────────────────────────
  // Acción: DAR CONFORMIDAD (POSTULANTE)
  // ─────────────────────────────────────────────
  async function handleDarConformidad(anexoId: string) {
    try {
      setLoadingAccion(anexoId);
      setError(null);
      setMessage(null);

      await apiClient.patch(`/formularios/${anexoId}/estado`, {
        estado: "CONFORMADO_POSTULANTE",
        observacion: "Conformidad otorgada por el postulante"
      });

      setMessage(
        "Conformidad registrada correctamente. El trámite vuelve al ADMIN GENERAL para su cierre."
      );

      await loadAnexos();
    } catch (err: any) {
      console.error("[PostulanteAnexos] Error conformidad:", err);
      setError(
        err?.response?.data?.message ||
          "No se pudo registrar la conformidad."
      );
    } finally {
      setLoadingAccion(null);
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">
          Mis trámites
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Anexos que requieren su conformidad como postulante.
        </p>
      </header>

      {user && (
        <div className="text-xs text-slate-400">
          Usuario:{" "}
          <span className="font-semibold text-slate-200">
            {user.nombre} {user.apellido}
          </span>
        </div>
      )}

      {loading && (
        <div className="text-sm text-sky-300">Cargando anexos...</div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {/* Lista de ANEXO 02 */}
      <section className="space-y-3">
        {anexos.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            No posee trámites pendientes en este momento.
          </div>
        ) : (
          anexos.map((anexo) => {
            const puedeConformar =
              anexo.estado !== "CERRADO" &&
              anexo.estado !== "CONFORMADO_POSTULANTE";

            return (
              <div
                key={anexo._id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">
                      ANEXO 02 – Asignación de vivienda
                    </p>
                    <p className="text-xs text-slate-400">
                      Iniciado el{" "}
                      {new Date(anexo.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right text-xs">
                    <div className="text-slate-300">
                      Estado:{" "}
                      <span className="font-semibold">{anexo.estado}</span>
                    </div>
                  </div>
                </div>

                {anexo.datos?.viviendaId && (
                  <p className="text-xs text-slate-400">
                    Vivienda asignada (proyectada)
                  </p>
                )}

                {puedeConformar ? (
                  <button
                    onClick={() => handleDarConformidad(anexo._id)}
                    disabled={loadingAccion === anexo._id}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-1.5 text-xs md:text-sm font-semibold text-slate-50 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingAccion === anexo._id
                      ? "Registrando conformidad..."
                      : "DAR CONFORMIDAD"}
                  </button>
                ) : (
                  <div className="mt-2 inline-flex rounded-full bg-emerald-900/40 px-3 py-1 text-[11px] text-emerald-200">
                    Conformidad ya registrada
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
