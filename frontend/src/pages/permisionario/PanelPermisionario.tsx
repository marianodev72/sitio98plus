// frontend/src/pages/permisionario/PanelPermisionario.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

export default function PanelPermisionario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      <h2>Panel del Permisionario</h2>

      <p style={{ maxWidth: 720 }}>
        Desde aquí puede consultar el estado del trámite y acceder a los módulos disponibles.
      </p>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginTop: 12,
          maxWidth: 720,
        }}
      >
        <div>
          <b>Usuario:</b> {user?.apellido} {user?.nombre}
        </div>
        <div>
          <b>Rol:</b> {user?.role}
        </div>
        <div>
          <b>Estado habitacional:</b> {user?.estadoHabitacional || "—"}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/app/permisionario/anexos")}>
          Mis anexos
        </button>

        <button onClick={() => navigate("/app/permisionario/mis-datos")}>
          Mis datos declarados
        </button>

        <button onClick={() => navigate("/app/permisionario/anexo-04/nuevo")}>
          Crear ANEXO 04
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7, maxWidth: 720 }}>
        <b>Nota:</b> Toda actualización de “Mis datos declarados” queda registrada con fecha y hora,
        y puede ser visualizada por Administración.
      </div>
    </div>
  );
}
