// frontend/src/pages/permisionario/MisServicios.tsx
import { useEffect, useState } from "react";
import http from "../../api/http";

type Servicio = {
  _id: string;
  viviendaCodigo: string;
  periodo: string;
  alertaActiva: boolean;
  leidoPorUsuario: boolean;
  fechaLectura?: string;
};

export default function MisServicios() {
  const [items, setItems] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await http.get("/servicios/mis-servicios");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function abrirServicio(id: string) {
    try {
      // 1) marcar leído
      await http.patch(`/servicios/${id}/marcar-leido`);
      // 2) abrir PDF
      window.open(`/api/servicios/${id}/pdf`, "_blank", "noopener");
      // 3) refrescar estado local
      cargar();
    } catch {
      // fail-closed: no feedback explícito
      setError(true);
    }
  }

  function descargarServicio(id: string) {
    // NO marca leído
    window.open(`/api/servicios/${id}/pdf`, "_blank", "noopener");
  }

  if (loading) return <div>Cargando…</div>;
  if (error)
    return (
      <div style={{ color: "#b00020" }}>
        No es posible procesar su solicitud, contáctese con el Administrador
      </div>
    );

  if (!items.length) return <div>No hay servicios para mostrar.</div>;

  return (
    <div>
      <h2>Mis Servicios</h2>

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th>Vivienda</th>
            <th>Período</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s._id}>
              <td>{s.viviendaCodigo}</td>
              <td>{s.periodo}</td>
              <td>
                {s.alertaActiva ? (
                  <b style={{ color: "#b00020" }}>Pendiente</b>
                ) : (
                  "Leído"
                )}
              </td>
              <td>
                <button onClick={() => abrirServicio(s._id)}>Ver</button>{" "}
                <button onClick={() => descargarServicio(s._id)}>
                  Descargar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
