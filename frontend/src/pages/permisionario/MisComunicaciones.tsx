// frontend/src/pages/permisionario/MisComunicaciones.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import Mensajeria from "../admin_general/Mensajeria";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function MisComunicaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Gate institucional: solo PERMISIONARIO
  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  // ⚠️ Barrio puede no estar materializado en algunos permisionarios.
  // Seguridad: NO se habilita selección libre de barrio.
  // Funcionalidad: Mensajería debe seguir operativa al menos con ADMIN/ADMIN_GENERAL;
  // si existe barrio, el backend habilitará autoridades de su barrio.
  const barrio = String(user?.barrioAsignado || "").trim();

  return (
    <div style={{ padding: 24 }}>
      <h2>Mis comunicaciones</h2>

      <p style={{ opacity: 0.85 }}>
        Este módulo permite enviar y recibir mensajes institucionales.
      </p>

      <div style={{ marginTop: 16 }}>
        <Mensajeria lockedBarrio={barrio || undefined} hideBarrioSelect />
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => navigate("/app/permisionario")}>Volver</button>
      </div>
    </div>
  );
}
