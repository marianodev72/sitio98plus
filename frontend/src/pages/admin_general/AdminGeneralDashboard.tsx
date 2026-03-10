// frontend/src/pages/admin_general/RegistrosAdminGeneral.tsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";

type UsuarioPendiente = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;
  role?: string;
  activo?: boolean;
  archivado?: boolean;
  createdAt?: string;
};

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function RegistrosAdminGeneral() {
  const [items, setItems] = useState<UsuarioPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  function clearMessages() {
    setError("");
    setInfo("");
  }

  async function cargar() {
    setLoading(true);
    clearMessages();

    try {
      // ✅ Pendientes institucionales:
      // - role=POSTULANTE
      // - activo=false (aún no puede autenticarse)
      // - archivado=false
      const res = await http.get("/users/admin-list", {
        params: {
          role: "POSTULANTE",
          activo: "false",
          archivado: "false",
          sortBy: "apellido",
          sortDir: "asc",
          limit: 500,
        },
      });

      const list = Array.isArray(res.data?.usuarios) ? (res.data.usuarios as UsuarioPendiente[]) : [];
      setItems(list);
    } catch {
      setItems([]);
      setError("Su solicitud no ha podido ser procesada, contacte al Administrador");
    } finally {
      setLoading(false);
    }
  }

  async function aprobar(u: UsuarioPendiente) {
    const id = String(u?._id || "");
    if (!id) return;

    setBusyId(id);
    clearMessages();

    try {
      // ✅ Aprobación institucional:
      // El registro ya está como POSTULANTE pero inactivo => aprobar = activar
      await http.patch(`/users/${id}/activo`, {
        activo: true,
        observacion: "Aprobación de registro (ADMIN GENERAL)",
      });

      setInfo("Registro aprobado.");
      await cargar();
    } catch {
      setError("Su solicitud no ha podido ser procesada, contacte al Administrador");
    } finally {
      setBusyId(null);
    }
  }

  async function desaprobar(u: UsuarioPendiente) {
    const id = String(u?._id || "");
    if (!id) return;

    setBusyId(id);
    clearMessages();

    try {
      // ✅ Desaprobación institucional (fail-closed): archivar/bloquear
      await http.post(`/users/${id}/archive`, {
        motivo: "Registro desaprobado (ADMIN GENERAL)",
      });

      setInfo("Registro desaprobado.");
      await cargar();
    } catch {
      setError("Su solicitud no ha podido ser procesada, contacte al Administrador");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => items || [], [items]);

  if (loading) return <p>Cargando registros…</p>;

  return (
    <div>
      <h1>Registros (pendientes)</h1>

      <p style={{ opacity: 0.8, marginTop: 4 }}>
        Aquí se visualizan registros <b>POSTULANTE</b> con <b>activo=false</b>. Aprobar los convierte en{" "}
        <b>POSTULANTE activo</b> (ya puede autenticarse).
      </p>

      {error ? <p style={{ fontWeight: 700, color: "darkred" }}>{error}</p> : null}
      {info ? <p style={{ fontWeight: 700, color: "darkgreen" }}>{info}</p> : null}

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <button onClick={cargar} disabled={!!busyId}>
          Recargar
        </button>
      </div>

      {rows.length === 0 ? (
        <p>No hay registros pendientes.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
            <thead>
              <tr>
                {["Apellido", "Nombre", "Email", "DNI", "Matrícula", "Rol", "Activo", "Acciones"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e5e5e5",
                      padding: "10px 8px",
                      fontSize: 13,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const id = String(u._id);
                const busy = busyId === id;

                return (
                  <tr key={id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(u.apellido)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(u.nombre)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(u.email)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(u.dni)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(u.matricula)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>
                      <b>{safe(up(u.role))}</b>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>
                      <b>{u.activo ? "SI" : "NO"}</b>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => aprobar(u)} disabled={busy}>
                          {busy ? "Procesando…" : "Aprobar"}
                        </button>
                        <button onClick={() => desaprobar(u)} disabled={busy}>
                          {busy ? "Procesando…" : "Desaprobar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
