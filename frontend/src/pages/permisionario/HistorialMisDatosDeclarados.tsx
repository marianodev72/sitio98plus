//frontend/src/pages/permisionario/HistorialMisDatosDeclarados.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

function fmtFecha(ts?: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-AR");
  } catch {
    return "—";
  }
}

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export default function HistorialMisDatosDeclarados() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    setOpenId(null);
    setDetalle(null);

    try {
      const res = await http.get("/formularios/mis-datos-declarados/historial?limit=100");
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e: any) {
      setItems([]);
      setError(e?.response?.data?.message || "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }

  async function verItem(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetalle(null);
      return;
    }

    setOpenId(id);
    setDetalle(null);
    setLoadingDetalle(true);

    try {
      const res = await http.get(`/formularios/mis-datos-declarados/${id}`);
      setDetalle(res.data?.item || null);
    } catch (e: any) {
      setDetalle({ _error: e?.response?.data?.message || "No se pudo cargar el detalle." });
    } finally {
      setLoadingDetalle(false);
    }
  }

  function descargarPdf(id: string) {
    // abre nueva pestaña, el backend fuerza attachment
    window.open(`/api/formularios/mis-datos-declarados/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Historial de actualizaciones</h2>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Registro auditable de modificaciones realizadas por el permisionario.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => navigate("/app/permisionario/mis-datos")}>Volver</button>
          <button onClick={() => navigate("/app/permisionario/mis-datos/actualizar")}>Actualizar</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? <div>Cargando…</div> : null}

        {error ? (
          <div style={{ padding: 12, border: "1px solid #ffb3b3", background: "#fff3f3", borderRadius: 8 }}>
            <b>Error:</b> {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            Sin actualizaciones registradas.
          </div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", background: "white" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd", width: 220 }}>Fecha</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Resumen</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Motivo</th>
                  <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd", width: 170 }}>
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((it) => {
                  const id = String(it?._id || "");
                  const isOpen = openId === id;

                  return (
                    <>
                      <tr key={id}>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {fmtFecha(it?.createdAt)}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {it?.resumen || "—"}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          {it?.motivo || "—"}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => verItem(id)}>{isOpen ? "Cerrar" : "Ver"}</button>
                            <button onClick={() => descargarPdf(id)}>PDF</button>
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr>
                          <td colSpan={4} style={{ padding: 12, borderBottom: "1px solid #eee", background: "#fafafa" }}>
                            {loadingDetalle ? (
                              <div>Cargando detalle…</div>
                            ) : detalle?._error ? (
                              <div style={{ padding: 10, border: "1px solid #ffb3b3", background: "#fff3f3", borderRadius: 8 }}>
                                <b>Error:</b> {detalle._error}
                              </div>
                            ) : (
                              <DetalleMisDatos item={detalle} />
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetalleMisDatos({ item }: { item: any }) {
  const d = item?.datos && typeof item.datos === "object" ? item.datos : {};

  const convivientes = safeArray(d?.convivientes);
  const mascotas = safeArray(d?.mascotas);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        <b>ID:</b> {String(item?._id || "—")} &nbsp;|&nbsp; <b>Fecha:</b>{" "}
        {item?.createdAt ? new Date(item.createdAt).toLocaleString("es-AR") : "—"}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "white" }}>
        <h3 style={{ marginTop: 0 }}>Datos personales y destino</h3>
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 8 }}>
          <b>Apellido</b><span>{d.apellido || "—"}</span>
          <b>Nombres</b><span>{d.nombres || "—"}</span>
          <b>Grado / Escalafón</b><span>{d.gradoEscalafon || "—"}</span>
          <b>Matrícula</b><span>{d.matricula || "—"}</span>
          <b>Años de servicio</b><span>{d.aniosServicioRecibo || "—"}</span>
          <b>Destino (lugar de trabajo)</b><span>{d.destinoActual || "—"}</span>
          <b>Teléfono de contacto</b><span>{d.telefonoActual || "—"}</span>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "white" }}>
        <h3 style={{ marginTop: 0 }}>Grupo conviviente / familiar</h3>
        {convivientes.length === 0 ? (
          <div>(sin datos)</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {convivientes.map((c: any, idx: number) => (
              <div key={idx} style={{ padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
                <b>{idx + 1}.</b>{" "}
                {[c.parentesco, c.apellido, c.nombre].filter(Boolean).join(" — ") || "(registro)"}
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  {c.dni ? <>DNI: {c.dni} &nbsp; </> : null}
                  {c.edad ? <>Edad: {c.edad} &nbsp; </> : null}
                  {c.observaciones ? <>Obs: {c.observaciones}</> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "white" }}>
        <h3 style={{ marginTop: 0 }}>Mascotas</h3>
        {mascotas.length === 0 ? (
          <div>(sin datos)</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {mascotas.map((m: any, idx: number) => (
              <div key={idx} style={{ padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
                <b>{idx + 1}.</b>{" "}
                {[m.tipo, m.nombre].filter(Boolean).join(" — ") || "(registro)"}
                {m.observaciones ? (
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                    Obs: {m.observaciones}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
