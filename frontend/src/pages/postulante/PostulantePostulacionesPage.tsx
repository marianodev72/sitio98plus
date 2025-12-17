// src/pages/postulante/PostulantePostulacionesPage.tsx
import { useEffect, useState } from "react";
import { getMisAnexos } from "../../api/formularios";

type Anexo01 = {
  _id: string;
  codigo: string;
  estado: string;
  createdAt?: string;
  datos?: Record<string, any>;
};

function niceDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("es-AR");
}

export default function PostulantePostulacionesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Anexo01[]>([]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const list = (await getMisAnexos("ANEXO_01")) as Anexo01[];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cargando postulaciones.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Mis Postulaciones</h1>
            <p className="text-xs text-slate-400 mt-1">ANEXO 01 · Presentaciones realizadas</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {error && (
        <div className="text-xs text-rose-200 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        {loading ? (
          <div className="text-xs text-slate-400">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400">No hay postulaciones (ANEXO_01) registradas.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a._id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{a.codigo}</div>
                  <div className="text-[10px] text-slate-400">{niceDate(a.createdAt)}</div>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Estado: <span className="text-slate-200">{a.estado}</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-300 break-all">
                  ID: {a._id}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
