import type { CSSProperties } from "react";
import type { Notificacion } from "../../api/notificaciones";

type Props = {
  notificacion: Notificacion;
  busy?: boolean;
  onVerAhora: () => void;
  onEntendido: () => void;
};

function colorFor(prioridad: string) {
  if (prioridad === "CRITICA") return { main: "#ef4444", soft: "rgba(239,68,68,0.18)", icon: "!" };
  if (prioridad === "IMPORTANTE") return { main: "#f59e0b", soft: "rgba(245,158,11,0.18)", icon: "i" };
  return { main: "#38bdf8", soft: "rgba(56,189,248,0.18)", icon: "i" };
}

export default function PostLoginNotificationModal({
  notificacion,
  busy = false,
  onVerAhora,
  onEntendido,
}: Props) {
  const colors = colorFor(notificacion.prioridad);
  const accionUrl = String(notificacion.accionUrl || "").trim();
  const accionTexto = String(notificacion.accionTexto || "Ver ahora").trim();

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "rgba(3,7,18,0.72)",
    backdropFilter: "blur(8px)",
  };

  const cardStyle: CSSProperties = {
    width: "min(560px, 100%)",
    borderRadius: 18,
    border: `1px solid ${colors.main}`,
    background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
    color: "#f8fafc",
    boxShadow: `0 26px 90px ${colors.soft}`,
    padding: 24,
    animation: "notificacionPostLoginIn 180ms ease-out",
  };

  const iconStyle: CSSProperties = {
    width: 54,
    height: 54,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: colors.soft,
    color: colors.main,
    border: `1px solid ${colors.main}`,
    fontSize: 30,
    fontWeight: 950,
    flex: "0 0 auto",
  };

  const buttonBase: CSSProperties = {
    border: 0,
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 900,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.72 : 1,
  };

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="notificacion-post-login-title">
      <style>
        {`@keyframes notificacionPostLoginIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }`}
      </style>
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={iconStyle}>{colors.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: colors.main, fontWeight: 950, fontSize: 12, letterSpacing: 0 }}>
              {notificacion.prioridad}
            </div>
            <h2 id="notificacion-post-login-title" style={{ margin: "4px 0 10px", fontSize: 24, lineHeight: 1.15 }}>
              {notificacion.titulo}
            </h2>
            <p style={{ margin: 0, color: "rgba(248,250,252,0.82)", lineHeight: 1.5 }}>
              {notificacion.mensaje}
            </p>
          </div>
        </div>

        {accionUrl && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontSize: 12, color: "rgba(248,250,252,0.66)", fontWeight: 900, marginBottom: 4 }}>
              Que debe hacer
            </div>
            <div style={{ fontWeight: 800 }}>{accionTexto}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 22 }}>
          <button
            type="button"
            onClick={onEntendido}
            disabled={busy}
            style={{ ...buttonBase, background: "rgba(255,255,255,0.10)", color: "#f8fafc" }}
          >
            Entendido
          </button>
          {accionUrl && (
            <button
              type="button"
              onClick={onVerAhora}
              disabled={busy}
              style={{ ...buttonBase, background: colors.main, color: "#020617" }}
            >
              Ver ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
