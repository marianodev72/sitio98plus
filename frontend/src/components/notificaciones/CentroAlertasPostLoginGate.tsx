import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAlertasPostLoginResumen, type AlertaPostLogin } from "../../api/alertas";
import { confirmarNotificacion, marcarNotificacionLeida } from "../../api/notificaciones";
import { useAuth } from "../../auth/useAuth";

function isInternalAppPath(value: unknown): value is string {
  const url = String(value || "").trim();
  return Boolean(
    url &&
      url.startsWith("/") &&
      !url.startsWith("//") &&
      !url.startsWith("/api/") &&
      !url.includes("\\")
  );
}

function dismissedKey(userId: string) {
  return `sitio98:alertas-post-login:dismissed:${userId}`;
}

function colorFor(prioridad: string) {
  if (prioridad === "CRITICA") return { main: "#ef4444", soft: "rgba(239,68,68,0.16)" };
  if (prioridad === "ALTA") return { main: "#f59e0b", soft: "rgba(245,158,11,0.15)" };
  if (prioridad === "MEDIA") return { main: "#38bdf8", soft: "rgba(56,189,248,0.14)" };
  return { main: "#94a3b8", soft: "rgba(148,163,184,0.12)" };
}

function getNotificacionId(alerta: AlertaPostLogin) {
  return String(alerta.metadata?.notificacionId || "").trim();
}

async function cerrarNotificacionFormal(alerta: AlertaPostLogin) {
  if (alerta.tipo !== "NOTIFICACION") return;
  const id = getNotificacionId(alerta);
  if (!id) return;

  const prioridadOriginal = String(alerta.metadata?.prioridadOriginal || "").toUpperCase();
  if (alerta.requiereConfirmacion || prioridadOriginal === "CRITICA") {
    await confirmarNotificacion(id);
    return;
  }

  await marcarNotificacionLeida(id);
}

export default function CentroAlertasPostLoginGate() {
  const { user, initialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const checkedUserRef = useRef("");
  const [alertas, setAlertas] = useState<AlertaPostLogin[]>([]);
  const [busy, setBusy] = useState(false);

  const userId = String(user?._id || "");
  const puedeConsultar = useMemo(() => {
    if (!initialized || !userId) return false;
    if (user?.mustChangePassword === true) return false;
    if (location.pathname === "/login" || location.pathname === "/change-password") return false;
    return true;
  }, [initialized, location.pathname, user?.mustChangePassword, userId]);

  useEffect(() => {
    if (!puedeConsultar) return;
    if (checkedUserRef.current === userId) return;

    checkedUserRef.current = userId;
    let cancelado = false;

    getAlertasPostLoginResumen()
      .then((resumen) => {
        if (cancelado) return;
        const items = resumen.alertas || [];
        const intrusivas = items.filter((item) => item.prioridad !== "INFO");
        const dismissed = sessionStorage.getItem(dismissedKey(userId)) === "1";
        if (!intrusivas.length || dismissed) {
          setAlertas([]);
          return;
        }
        setAlertas(items);
      })
      .catch(() => {
        if (!cancelado) setAlertas([]);
      });

    return () => {
      cancelado = true;
    };
  }, [puedeConsultar, userId]);

  useEffect(() => {
    if (!alertas.length) return;
    (window as any).__sitio98PostLoginModalActivo = true;
    return () => {
      (window as any).__sitio98PostLoginModalActivo = false;
    };
  }, [alertas.length]);

  if (!alertas.length) return null;

  const visibles = alertas.filter((item) => item.prioridad !== "INFO");
  const informativas = alertas.filter((item) => item.prioridad === "INFO");
  const total = visibles.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);

  function cerrarMasTarde() {
    sessionStorage.setItem(dismissedKey(userId), "1");
    setAlertas([]);
  }

  async function marcarFormalesYcerrar() {
    if (busy) return;
    setBusy(true);
    try {
      const formales = alertas.filter((item) => item.tipo === "NOTIFICACION");
      await Promise.allSettled(formales.map(cerrarNotificacionFormal));
      sessionStorage.setItem(dismissedKey(userId), "1");
      setAlertas([]);
    } finally {
      setBusy(false);
    }
  }

  async function verAlerta(alerta: AlertaPostLogin) {
    if (busy) return;
    const accionUrl = String(alerta.accionUrl || "").trim();
    if (!isInternalAppPath(accionUrl)) return;

    setBusy(true);
    try {
      if (alerta.tipo === "NOTIFICACION") {
        await cerrarNotificacionFormal(alerta);
      }
      sessionStorage.setItem(dismissedKey(userId), "1");
      setAlertas([]);
      navigate(accionUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="centro-alertas-title">
      <style>
        {`@keyframes centroAlertasIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }`}
      </style>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Centro de alertas</div>
            <h2 id="centro-alertas-title" style={styles.title}>
              Tiene pendientes institucionales
            </h2>
            <p style={styles.subtitle}>
              {total} pendiente(s) requieren lectura, seguimiento o intervencion segun su rol.
            </p>
          </div>
        </div>

        <div style={styles.list}>
          {visibles.map((item) => {
            const colors = colorFor(item.prioridad);
            return (
              <div key={item.id} style={{ ...styles.item, borderColor: colors.main, background: colors.soft }}>
                <div style={styles.itemTop}>
                  <div style={{ ...styles.badge, color: colors.main, borderColor: colors.main }}>
                    {item.prioridad}
                  </div>
                  <div style={styles.module}>{item.modulo}</div>
                  {item.cantidad > 1 ? <div style={styles.count}>{item.cantidad}</div> : null}
                </div>
                <h3 style={styles.itemTitle}>{item.titulo}</h3>
                <p style={styles.itemText}>{item.descripcion}</p>
                <div style={styles.itemFooter}>
                  <span style={styles.tipo}>{item.tipo}</span>
                  {isInternalAppPath(item.accionUrl) ? (
                    <button type="button" disabled={busy} style={styles.linkButton} onClick={() => verAlerta(item)}>
                      {item.modulo === "MENSAJES" ? "Ver mensajes" : "Ver"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {informativas.length > 0 ? (
          <div style={styles.infoBox}>
            {informativas.length} notificacion(es) informativa(s) disponible(s) en el centro de alertas.
          </div>
        ) : null}

        <div style={styles.actions}>
          <button type="button" disabled={busy} style={styles.secondaryButton} onClick={cerrarMasTarde}>
            Mas tarde
          </button>
          <button type="button" disabled={busy} style={styles.primaryButton} onClick={marcarFormalesYcerrar}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "rgba(3,7,18,0.72)",
    backdropFilter: "blur(8px)",
  },
  card: {
    width: "min(720px, 100%)",
    maxHeight: "min(780px, calc(100vh - 40px))",
    overflow: "auto",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
    color: "#f8fafc",
    boxShadow: "0 26px 90px rgba(0,0,0,0.42)",
    padding: 22,
    animation: "centroAlertasIn 180ms ease-out",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  eyebrow: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    margin: "4px 0 8px",
    fontSize: 24,
    lineHeight: 1.18,
  },
  subtitle: {
    margin: 0,
    color: "rgba(248,250,252,0.74)",
    lineHeight: 1.45,
  },
  list: {
    display: "grid",
    gap: 10,
  },
  item: {
    border: "1px solid rgba(148,163,184,0.35)",
    borderRadius: 14,
    padding: 14,
  },
  itemTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    border: "1px solid currentColor",
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 950,
  },
  module: {
    color: "rgba(248,250,252,0.7)",
    fontSize: 12,
    fontWeight: 900,
  },
  count: {
    marginLeft: "auto",
    minWidth: 28,
    height: 24,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.12)",
    fontWeight: 950,
  },
  itemTitle: {
    margin: "0 0 6px",
    fontSize: 17,
    lineHeight: 1.25,
  },
  itemText: {
    margin: 0,
    color: "rgba(248,250,252,0.8)",
    lineHeight: 1.45,
  },
  itemFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  tipo: {
    color: "rgba(248,250,252,0.62)",
    fontSize: 12,
    fontWeight: 800,
  },
  linkButton: {
    border: "1px solid rgba(56,189,248,0.75)",
    background: "rgba(56,189,248,0.12)",
    color: "#f8fafc",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  infoBox: {
    marginTop: 12,
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(148,163,184,0.08)",
    color: "rgba(248,250,252,0.72)",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 18,
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "#f8fafc",
    borderRadius: 12,
    padding: "11px 15px",
    fontWeight: 900,
    cursor: "pointer",
  },
  primaryButton: {
    border: "1px solid rgba(56,189,248,0.9)",
    background: "#38bdf8",
    color: "#020617",
    borderRadius: 12,
    padding: "11px 15px",
    fontWeight: 950,
    cursor: "pointer",
  },
};
