// frontend/src/pages/permisionario/inspector/InspectorDashboard.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(perm));
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function InspectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = up(user?.role);

  // Modelo institucional: INSPECTOR es permiso sobre PERMISIONARIO (compat con role legacy)
  const esInspector =
    (role === "PERMISIONARIO" && hasPerm(user, "INSPECTOR")) || role === "INSPECTOR";

  const barrio = useMemo(() => String(user?.barrioAsignado || "").trim(), [user]);

  // Fail-closed: sin permiso o sin incumbencia territorial
  if (!esInspector || !barrio) {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const base = "/app/permisionario/mi-barrio-inspector";

  return (
    <div style={{ padding: 8 }}>
      <h1 style={{ marginTop: 0 }}>Panel del Inspector</h1>

      <div
        style={{
          padding: 12,
          border: "1px solid #ddd",
          background: "white",
          borderRadius: 10,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <b>Inspector:</b> {safe(user?.apellido)} {safe(user?.nombre)}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>Barrio asignado:</b> {barrio}
        </div>

        <p style={{ marginTop: 0, opacity: 0.9 }}>
          Desde este panel podrá gestionar las viviendas, anexos y comunicaciones correspondientes a su barrio.
        </p>

        <h3 style={{ margin: "14px 0 8px 0" }}>Módulos</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate(`${base}/viviendas`)}>Viviendas</button>
          <button onClick={() => navigate(`${base}/gestiones`)}>Gestiones</button>
          <button onClick={() => navigate(`${base}/mensajeria`)}>Mensajería</button>
        </div>
      </div>
    </div>
  );
}
