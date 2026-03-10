// frontend/src/pages/permisionario/jefe/JefeBarrioDashboard.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray((user as any)?.permisos) ? (user as any).permisos : [];
  return list.map(up).includes(up(permiso));
}

export default function JefeBarrioDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const esJefe = role === "PERMISIONARIO" && hasPermiso(user, "JEFE_DE_BARRIO");

  if (!esJefe) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al administrador.
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Panel — Jefe de Barrio</h2>

      <div style={{ marginBottom: 12, opacity: 0.9 }}>
        Barrio asignado: <b>{String((user as any)?.barrioAsignado || "—")}</b>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Gestiones</h3>
          <p style={{ margin: "6px 0 12px 0", opacity: 0.9 }}>
            Solo: <b>ANEXO_04</b> y <b>mis ANEXO_11</b>.
          </p>
          <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe/gestiones")}>
            Abrir Gestiones
          </button>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Crear ANEXO 11</h3>
          <p style={{ margin: "6px 0 12px 0", opacity: 0.9 }}>
            Reparación / mantenimiento / provisión para <b>espacio común</b>.
          </p>
          <button
            onClick={() => navigate("/app/permisionario/mi-barrio-jefe/crear-anexo-11")}
            style={{ fontWeight: 800 }}
          >
            Nuevo ANEXO 11
          </button>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Mensajes</h3>
          <p style={{ margin: "6px 0 12px 0", opacity: 0.9 }}>
            Canal institucional (filtrado por backend).
          </p>
          <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe/mensajeria")}>
            Abrir Mensajería
          </button>
        </div>
      </div>
    </div>
  );
}
