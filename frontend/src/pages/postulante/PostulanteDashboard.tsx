import { useAuth } from "../../auth/useAuth";

function safe(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export default function PostulanteDashboard() {
  const { user } = useAuth();
  const nombreCompleto = [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim();

  return (
    <div style={{ padding: 24 }}>
      <h2>Panel del Postulante</h2>

      <p style={{ marginTop: 6 }}>
        Bienvenido al sistema SITIO 98{nombreCompleto ? `, ${nombreCompleto}` : ""}.
      </p>

      <section
        style={{
          marginTop: 14,
          padding: 16,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
          color: "#F8FAFC",
          maxWidth: 720,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <strong>Nombre:</strong> {safe(nombreCompleto)}
          </div>
          <div>
            <strong>Rol:</strong> {safe(user?.role || "POSTULANTE")}
          </div>
          <div>
            <strong>Email:</strong> {safe(user?.email)}
          </div>
        </div>
        <p style={{ margin: "12px 0 0", color: "#CBD5E1" }}>
          Desde este panel puede iniciar postulaciones institucionales y consultar sus anexos presentados.
        </p>
      </section>

      <ul style={{ marginTop: 12 }}>
        <li>Desde aqui puede gestionar su postulacion habitacional.</li>
        <li>Acceda al menu superior para iniciar o consultar anexos.</li>
      </ul>
    </div>
  );
}
