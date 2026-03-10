import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safeFileNameDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}`;
}

export default function MiBarrio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const permisos = Array.isArray(user?.permisos) ? user!.permisos : [];
  const permisosUp = permisos.map((p: any) => up(typeof p === "string" ? p : p?.codigo ?? p?.nombre ?? p));
  const esInspector = permisosUp.includes("INSPECTOR");


  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function cargar() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      // El inspector ve los ANEXO_03 donde está como interviniente (o creador)
      const res = await http.get("/formularios/mios", { params: { codigo: "ANEXO_03" } });
      const list = Array.isArray(res.data?.anexos) ? res.data.anexos : [];
      setItems(list);
    } catch (e) {
      console.error("[MI BARRIO] Error", e);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf(id: string, codigo: string) {
    setErrorMsg("");
    try {
      const res = await http.get(`/formularios/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_${up(codigo)}_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[MI BARRIO] Error PDF", e);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!esInspector) {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <h2 style={{ marginTop: 0 }}>MI BARRIO (INSPECTOR)</h2>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Aquí estarán las funciones institucionales del rol INSPECTOR. En esta etapa listamos los ANEXO_03 asignados.
      </p>

      {errorMsg ? (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #ccc", background: "#f7f7f7" }}>
          {errorMsg}
        </div>
      ) : null}

      <section style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd", background: "white", borderRadius: 10 }}>
        <button onClick={cargar} disabled={loading}>
          {loading ? "Cargando…" : "Actualizar"}
        </button>
        <span style={{ marginLeft: 12 }}>Resultados: {items.length}</span>
      </section>

      <section style={{ border: "1px solid #ddd", background: "white", borderRadius: 10, padding: 12 }}>
        {loading ? (
          <p>Cargando anexos…</p>
        ) : items.length === 0 ? (
          <p>No hay ANEXO_03 asignados al inspector.</p>
        ) : (
          <table border={1} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((an) => (
                <tr key={an._id}>
                  <td>{safe(an.codigo)}</td>
                  <td>
                    {safe(an.estado)}
                    {an.estadoInstitucional ? ` / ${safe(an.estadoInstitucional)}` : ""}
                  </td>
                  <td>{fmtDate(an.createdAt)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button onClick={() => navigate(`/app/permisionario/anexos/${an._id}`)}>Ver</button>{" "}
                    <button onClick={() => descargarPdf(an._id, an.codigo)}>PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
