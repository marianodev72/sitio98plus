// src/pages/admin/AdminPostulantesPage.jsx

import { useEffect, useState } from "react";
import { getPostulaciones } from "../../api/postulacionesApi";
import InstitutionalHeader from "../../components/layout/InstitutionalHeader";
import BackButton from "../../components/layout/BackButton";
import { Link } from "react-router-dom";

export default function AdminPostulantesPage() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError("");

        const data = await getPostulaciones();
        const items = Array.isArray(data) ? data : data.items || [];
        setPostulaciones(items);
      } catch (err) {
        console.error(err);
        setError("Error cargando las postulaciones.");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("zn98_token");
    localStorage.removeItem("zn98_user");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <InstitutionalHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <BackButton />
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2">Gestión de Postulaciones</h1>
        <p className="text-sm text-slate-300 mb-4">
          Panel para visualizar las postulaciones registradas en el sistema.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/70 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-slate-300 text-sm">Cargando postulaciones...</p>
        ) : postulaciones.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No hay postulaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto bg-slate-900/70 border border-slate-700 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/80">
                <tr className="text-left text-slate-300">
                  <th className="px-4 py-2">MR</th>
                  <th className="px-4 py-2">Apellido y nombres</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {postulaciones.map((p) => {
                  const datos = p.datos || {};
                  const apellido = datos.apellido || "";
                  const nombres = datos.nombres || "";
                  const mr = datos.mr || datos.MR || "";

                  return (
                    <tr
                      key={p._id}
                      className="border-t border-slate-700/70 hover:bg-slate-800/70 cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <Link to={`/admin/postulaciones/${p._id}`}>
                          {mr}
                        </Link>
                      </td>

                      <td className="px-4 py-2">
                        <Link to={`/admin/postulaciones/${p._id}`}>
                          {apellido} {nombres}
                        </Link>
                      </td>

                      <td className="px-4 py-2">{p.tipo}</td>
                      <td className="px-4 py-2">{p.estado}</td>
                      <td className="px-4 py-2">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("es-AR")
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
