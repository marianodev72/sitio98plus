// src/pages/Anexo7List.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API_BASE_URL = "http://localhost:3000/api";

const estadoLabels = {
  BORRADOR: "Borrador",
  ENVIADO_A_INSPECTOR: "Enviado a Inspector",
  DEVUELTO_POR_INSPECTOR: "Devuelto por Inspector",
  APROBADO_POR_INSPECTOR: "Aprobado por Inspector",
  ENVIADO_A_ADMIN: "Enviado a Administración",
  APROBADO_POR_ADMIN: "Cerrado",
};

export default function Anexo7List() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchAnexos = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/anexo7/mios`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) return logout();
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando Anexo 7:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchAnexos();
  }, [token, logout]);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/mis-gestiones")}
        >
          ← Volver a Mis gestiones
        </button>

        <h1 className="text-3xl font-bold mb-2">Mis Anexos 7</h1>

        <div className="mb-4">
          <button
            onClick={() => navigate("/permisionario/gestiones/anexo7/nuevo")}
            className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400"
          >
            Iniciar nuevo Anexo 7
          </button>
        </div>

        <div className="bg-[#0b1020] border border-slate-700 rounded-2xl p-4">
          {cargando ? (
            <p className="text-slate-400 text-sm">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Todavía no tenés Anexos 7 registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((anexo) => (
                <Link
                  key={anexo._id}
                  to={`/permisionario/gestiones/anexo7/${anexo._id}`}
                  className="block rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 hover:border-sky-500"
                >
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div>
                      <p className="text-sm text-slate-100">
                        {anexo.numero} · {anexo.barrio} · {anexo.vivienda}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Estado: {estadoLabels[anexo.estado] || anexo.estado}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-100">
                      {estadoLabels[anexo.estado] || anexo.estado}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
