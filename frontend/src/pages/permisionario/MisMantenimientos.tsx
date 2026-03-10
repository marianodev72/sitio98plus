// frontend/src/pages/permisionario/MisMantenimientos.tsx
import { useNavigate } from "react-router-dom";
import { urlFormularioBlank } from "../../api/misMantenimientos";
import { useAuth } from "../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function MisMantenimientos() {
  const nav = useNavigate();
  const { user } = useAuth();

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Mis Mantenimientos</h2>

      <p style={{ opacity: 0.85 }}>
        Cargue solicitudes de mantenimiento y consulte su historial.
        La vivienda y el permisionario se autocompletan por sistema.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <button
          type="button"
          onClick={() => nav("/app/permisionario/mis-mantenimientos/nuevo")}
        >
          Cargar mantenimiento
        </button>

        <button
  type="button"
  onClick={() => nav("/app/permisionario/mis-mantenimientos/listado")}
>
  Ver mantenimientos informados
</button>


        <a href={urlFormularioBlank()} target="_blank" rel="noreferrer">
          <button type="button">Descargar formulario (PDF)</button>
        </a>
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={() => nav("/app/permisionario")}>
          Volver
        </button>
      </div>
    </div>
  );
}
