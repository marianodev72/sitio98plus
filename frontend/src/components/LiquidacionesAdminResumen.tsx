//frontend/scr/components/LiquidacionesAdminResumen.tsx
import { useEffect, useState } from "react";

export default function LiquidacionesAdminResumen() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");

  async function fetchData() {
    const params = new URLSearchParams();
    if (q) params.append("q", q);

    const res = await fetch(`/api/liquidaciones/admin-resumen?${params}`);
    const json = await res.json();

    setData(json.registros || []);
  }

async function descargarPDF() {
  try {
    const token = localStorage.getItem("token") || "";
    const params = new URLSearchParams();

    if (q) params.append("q", q);

    const resp = await fetch(`/api/liquidaciones/admin-resumen-pdf?${params.toString()}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });

    if (!resp.ok) {
      throw new Error("No fue posible descargar el PDF");
    }

    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "liquidaciones_resumen.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("No fue posible descargar el PDF");
  }
}
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Resumen de Liquidaciones</h2>

      <input
        placeholder="Buscar por nombre o MR"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <button onClick={fetchData}>Buscar</button>
      <button onClick={descargarPDF}>Descargar PDF</button>

      <table border={1} style={{ width: "100%", marginTop: 12 }}>
        <thead>
          <tr>
            <th>Periodo</th>
            <th>MR</th>
            <th>Nombre</th>
            <th>457</th>
            <th>411</th>
            <th>Estado</th>
            <th>Tipo</th>
          </tr>
        </thead>

        <tbody>
          {data.map((r: any, i) => (
            <tr key={i}>
              <td>{r.periodo}</td>
              <td>{r.mr}</td>
              <td>{r.apellidoNombre}</td>
              <td>{r.cod457}</td>
              <td>{r.cod411}</td>
              <td>{r.estado}</td>
              <td>{r.tipoRegistro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}