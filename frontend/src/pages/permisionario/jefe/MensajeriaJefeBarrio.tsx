// frontend/src/pages/permisionario/jefe/MensajeriaJefeBarrio.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import Mensajeria from "../../admin_general/Mensajeria";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(permiso));
}

export default function MensajeriaJefeBarrio() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const esJefe = role === "PERMISIONARIO" && hasPermiso(user, "JEFE_DE_BARRIO");

  if (!esJefe) {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const barrio = String(user?.barrioAsignado || "").trim();

  return (
    <div style={{ padding: 24 }}>
      <h2>Mensajería — Jefe de Barrio</h2>

      <p style={{ opacity: 0.9 }}>
        Este módulo queda habilitado únicamente bajo las reglas institucionales de mensajería.
        Los destinatarios se filtran en backend (seguridad innegociable).
      </p>

      <div style={{ marginTop: 16 }}>
        <Mensajeria lockedBarrio={barrio} hideBarrioSelect />
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")}>
          Volver
        </button>
      </div>
    </div>
  );
}
