// src/pages/InspectorDashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function InspectorDashboard() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("zn98_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchPerfil = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || "No autorizado");

        if (data.user.role !== "INSPECTOR") {
          throw new Error("Este panel es solo para INSPECTORES.");
        }

        setUser(data.user);
      } catch (err) {
        setError(err.message || "Error cargando panel.");
      } finally {
        setCargando(false);
      }
    };

    fetchPerfil();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("zn98_token");
    localStorage.removeItem("zn98_user");
    navigate("/login");
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Cargando panel...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InstitutionalHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
          >
            Volver al login
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">
          Panel de Inspector
        </h1>
        <p className="text-slate-300 text-sm mb-4">
          Aquí verás las inspecciones asignadas y su estado (próximamente).
        </p>
      </main>
    </div>
  );
}
