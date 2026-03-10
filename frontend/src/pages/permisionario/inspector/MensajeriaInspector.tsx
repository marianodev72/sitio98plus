// frontend/src/pages/permisionario/inspector/MensajeriaInspector.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import Mensajeria from "../../admin_general/Mensajeria";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(perm));
}

export default function MensajeriaInspector() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const esInspector =
    (role === "PERMISIONARIO" && hasPerm(user, "INSPECTOR")) || role === "INSPECTOR";

  const barrio = String(user?.barrioAsignado || "").trim();

  // Fail-closed
  if (!esInspector || !barrio) {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Mensajería — Inspector</h2>

      <div style={{ marginTop: 16 }}>
        <Mensajeria lockedBarrio={barrio} hideBarrioSelect />
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}>
          Volver
        </button>
      </div>
    </div>
  );
}
