import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function AdminPostulacionDetallePage() {
  const { id } = useParams();
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/admin/postulaciones/${id}`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Error cargando detalle");

        setDetalle(await res.json());
      } catch (e) {
        setError(e.message);
      }
    };

    cargar();
  }, [id]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!detalle) return <p>Cargando...</p>;

  return (
    <div className="container">
      <h1>Detalle de postulación</h1>
      <pre>{JSON.stringify(detalle, null, 2)}</pre>
    </div>
  );
}
