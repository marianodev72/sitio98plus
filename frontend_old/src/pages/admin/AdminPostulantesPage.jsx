// src/pages/admin/AdminPostulantesPage.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

export default function AdminPostulantesPage() {
  const [lista, setLista] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/postulantes`, {
          credentials: "include",
        });

        console.log("[FRONT] /api/admin/postulantes status:", res.status);

        if (!res.ok) throw new Error("Error cargando postulantes");

        const data = await res.json();
        setLista(data || []);
      } catch (e) {
        console.error("[FRONT] Error cargando postulantes:", e);
        setError(e.message);
      }
    };

    cargar();
  }, []);

  return (
    <div className="container">
      <h1>Postulantes</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {lista.map((p, idx) => (
        <div
          key={p._id || idx}
          className="card"
          onClick={() =>
            p._id && navigate(`/admin/postulaciones/${p._id}`)
          }
        >
          <h3>
            {p.nombre} {p.apellido}
          </h3>
        </div>
      ))}
    </div>
  );
}
