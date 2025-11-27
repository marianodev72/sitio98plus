// src/pages/admin/AdminPostulacionDetallePage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getPostulacionById,
  updateEstado,
  deletePostulacion,
  descargarPdf,
} from "../../api/postulacionesApi";

export default function AdminPostulacionDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [postulacion, setPostulacion] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPostulacionById(id);
        setPostulacion(data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [id]);

  if (!postulacion) {
    return <div className="text-white p-6">Cargando…</div>;
  }

  const handleEstado = async (nuevo) => {
    await updateEstado(id, nuevo);
    alert("Estado actualizado");
    setPostulacion({ ...postulacion, estado: nuevo });
  };

  const handleBorrar = async () => {
    if (!confirm("¿Seguro deseas borrar esta postulación?")) return;
    await deletePostulacion(id);
    alert("Postulación eliminada");
    navigate("/admin/postulaciones");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      <button
        onClick={() => navigate("/admin/postulaciones")}
        className="mb-4 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded"
      >
        ← Volver
      </button>

      <h1 className="text-2xl font-semibold mb-4">
        Postulación #{postulacion._id}
      </h1>

      <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">

        <p><b>Matrícula:</b> {postulacion.matricula}</p>
        <p><b>Nombre:</b> {postulacion.nombre}</p>
        <p><b>Apellido:</b> {postulacion.apellido}</p>
        <p>
          <b>Fecha:</b>{" "}
          {new Date(postulacion.createdAt).toLocaleDateString()}
        </p>

        <div className="mt-3">
          <b>Estado:</b>{" "}
          <select
            className="bg-slate-800 p-2 rounded border border-slate-600"
            value={postulacion.estado}
            onChange={(e) => handleEstado(e.target.value)}
          >
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => descargarPdf(postulacion._id)}
            className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded"
          >
            Descargar PDF
          </button>

          <button
            onClick={handleBorrar}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded"
          >
            Borrar postulación
          </button>
        </div>
      </div>
    </div>
  );
}
