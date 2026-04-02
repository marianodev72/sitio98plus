// frontend/src/pages/permisionario/MisMantenimientos.tsx
import { useNavigate } from "react-router-dom";
import { urlFormularioBlank } from "../../api/misMantenimientos";
import { useAuth } from "../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

const styles = {
  page: {
    maxWidth: 1180,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  denied: {
    padding: 32,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  hero: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
    marginBottom: 16,
  } as React.CSSProperties,

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
  } as React.CSSProperties,

  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#ffffff",
  } as React.CSSProperties,

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 1.55,
    maxWidth: 900,
  } as React.CSSProperties,

  buttonRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  primaryButton: {
    border: "1px solid rgba(59,130,246,0.9)",
    background: "linear-gradient(180deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37,99,235,0.28)",
  } as React.CSSProperties,

  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  shell: {
    display: "grid",
    gap: 16,
  } as React.CSSProperties,

  card: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  } as React.CSSProperties,

  cardTitle: {
    margin: 0,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#fff",
  } as React.CSSProperties,

  cardText: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.6,
    fontSize: 14,
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    marginTop: 14,
  } as React.CSSProperties,

  actionCard: {
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    gap: 10,
  } as React.CSSProperties,

  actionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.58)",
  } as React.CSSProperties,

  actionText: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.92)",
    lineHeight: 1.5,
  } as React.CSSProperties,

  footerRow: {
    marginTop: 8,
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  linkWrap: {
    textDecoration: "none",
  } as React.CSSProperties,
};

export default function MisMantenimientos() {
  const nav = useNavigate();
  const { user } = useAuth();

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={styles.denied}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Mis Mantenimientos</h2>
            <div style={styles.subtitle}>
              Aquí podra descargar formularios y cargar sus informes de mantenimiento.
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={() => nav("/app/permisionario")}
              style={styles.secondaryButton}
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      <div style={styles.shell}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Acciones disponibles</h3>
          <div style={styles.cardText}>
            Desde aquí podés iniciar una nueva solicitud, consultar los mantenimientos informados o
            descargar el formulario en PDF para respaldo.
          </div>

          <div style={styles.grid}>
            <div style={styles.actionCard}>
              <div style={styles.actionTitle}>Nuevo mantenimiento</div>
              <div style={styles.actionText}>
                Registrá una nueva solicitud con su tipo correspondiente y la documentación en PDF.
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => nav("/app/permisionario/mis-mantenimientos/nuevo")}
                  style={styles.primaryButton}
                >
                  Cargar mantenimiento
                </button>
              </div>
            </div>

            <div style={styles.actionCard}>
              <div style={styles.actionTitle}>Listado informado</div>
              <div style={styles.actionText}>
                Revisá el historial de solicitudes enviadas y el estado de tratamiento institucional.
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => nav("/app/permisionario/mis-mantenimientos/listado")}
                  style={styles.secondaryButton}
                >
                  Ver mantenimientos informados
                </button>
              </div>
            </div>

            <div style={styles.actionCard}>
              <div style={styles.actionTitle}>Formulario PDF</div>
              <div style={styles.actionText}>
                Descargá el formulario institucional en blanco para consulta o respaldo documental.
              </div>
              <div>
                <a
                  href={urlFormularioBlank()}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.linkWrap}
                >
                  <button type="button" style={styles.secondaryButton}>
                    Descargar formulario (PDF)
                  </button>
                </a>
              </div>
            </div>
          </div>

          <div style={styles.footerRow}>
            <button
              type="button"
              onClick={() => nav("/app/permisionario/mis-mantenimientos/nuevo")}
              style={styles.primaryButton}
            >
              Iniciar nueva carga
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}