// frontend/src/pages/admin_general/RegistrosAdminGeneral.tsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type UsuarioPendiente = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;
  role?: string;
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
      // Listamos “pendientes” desde el listado institucional existente
      const res = await http.get("/users/admin-list", {
        params: {
          role: "PENDIENTE",
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
      // ✅ Promoción institucional: PENDIENTE -> POSTULANTE
      await http.patch(`/users/${id}/role`, {
        nuevoRol: "POSTULANTE",
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
      // ✅ Desaprobación institucional: archivado/bloqueado (fail-closed)
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

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={cardStyle}>
            <div style={softCardStyle}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>Cargando registros…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const thCellStyle = {
    textAlign: "left" as const,
    padding: "12px 10px",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.70)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap" as const,
  };

  const tdCellStyle = {
    padding: "12px 10px",
    fontSize: 14,
    color: "#ffffff",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top" as const,
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Registros (pendientes)</h1>
          <p style={subtitleStyle}>
            Aquí se visualizan usuarios con rol <b>PENDIENTE</b>. Aprobar los convierte en{" "}
            <b>POSTULANTE</b>.
          </p>
        </div>

        <div style={cardStyle}>
          {error ? (
            <div
              style={{
                ...softCardStyle,
                marginBottom: 14,
                border: "1px solid rgba(239,68,68,0.32)",
                background: "rgba(127,29,29,0.18)",
                color: "#fecaca",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>{error}</p>
            </div>
          ) : null}

          {info ? (
            <div
              style={{
                ...softCardStyle,
                marginBottom: 14,
                border: "1px solid rgba(34,197,94,0.28)",
                background: "rgba(22,101,52,0.18)",
                color: "#bbf7d0",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>{info}</p>
            </div>
          ) : null}

          <div style={buttonRowStyle}>
            <button onClick={cargar} disabled={!!busyId} style={primaryButtonStyle}>
              Recargar
            </button>
          </div>

          {rows.length === 0 ? (
            <div style={{ ...softCardStyle, marginTop: 14 }}>
              <h3 style={sectionTitleStyle}>Sin registros pendientes</h3>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>
                No hay registros pendientes.
              </p>
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                overflowX: "auto",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 860,
                }}
              >
                <thead>
                  <tr>
                    {["Apellido", "Nombre", "Email", "DNI", "Matrícula", "Rol", "Acciones"].map((h) => (
                      <th key={h} style={thCellStyle}>
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
                        <td style={tdCellStyle}>{safe(u.apellido)}</td>
                        <td style={tdCellStyle}>{safe(u.nombre)}</td>
                        <td style={tdCellStyle}>{safe(u.email)}</td>
                        <td style={tdCellStyle}>{safe(u.dni)}</td>
                        <td style={tdCellStyle}>{safe(u.matricula)}</td>
                        <td style={tdCellStyle}>
                          <b>{safe(up(u.role))}</b>
                        </td>
                        <td style={tdCellStyle}>
                          <div style={{ ...buttonRowStyle, marginTop: 0 }}>
                            <button onClick={() => aprobar(u)} disabled={busy} style={successButtonStyle}>
                              {busy ? "Procesando…" : "Aprobar"}
                            </button>

                            <button
                              onClick={() => desaprobar(u)}
                              disabled={busy}
                              style={{
                                ...secondaryButtonStyle,
                                border: "1px solid rgba(239,68,68,0.30)",
                                background: "rgba(239,68,68,0.12)",
                              }}
                            >
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
      </div>
    </div>
  );
}