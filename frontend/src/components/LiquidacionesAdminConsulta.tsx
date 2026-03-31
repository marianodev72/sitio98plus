import { useEffect, useState } from "react";

type Liquidacion = {
  _id: string;
  periodo: string;
  mr: string;
  apellidoNombre?: string;
  principal: { cod457: number; cod411: number };
  reintegros: { cod457: number; cod411: number };
  total: {
    cod457: number;
    cod411: number;
    etiqueta457: string;
    etiqueta411: string;
  };
  estadoEntrega: string;
};

export default function LiquidacionesAdminConsulta() {
  const [data, setData] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(false);

  const [periodo, setPeriodo] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (periodo) params.append("periodo", periodo);
      if (q) params.append("q", q);
      if (estado) params.append("estado", estado);

      const res = await fetch(`/api/liquidaciones/admin?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json();

      setData(json.liquidaciones || []);
    } catch (err) {
      console.error("Error cargando liquidaciones", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Consulta de Liquidaciones</h2>

      <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Periodo (YYYY-MM)"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        />

        <input
          type="text"
          placeholder="Buscar por apellido, nombre o MR"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 240 }}
        />

        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todas</option>
          <option value="ENTREGADA">Entregadas</option>
          <option value="NO_ENTREGADA">No entregadas</option>
        </select>

        <button onClick={fetchData}>Buscar</button>
      </div>

      {loading && <p>Cargando...</p>}

      {!loading && (
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Periodo</th>
              <th>MR</th>
              <th>Apellido y Nombre</th>
              <th>457</th>
              <th>411</th>
              <th>Tipo 457</th>
              <th>Tipo 411</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {data.map((liq) => (
              <tr key={liq._id}>
                <td>{liq.periodo}</td>
                <td>{liq.mr}</td>
                <td>{liq.apellidoNombre || "—"}</td>
                <td>{liq.total.cod457}</td>
                <td>{liq.total.cod411}</td>
                <td>{liq.total.etiqueta457}</td>
                <td>{liq.total.etiqueta411}</td>
                <td>{liq.estadoEntrega}</td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center" }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}