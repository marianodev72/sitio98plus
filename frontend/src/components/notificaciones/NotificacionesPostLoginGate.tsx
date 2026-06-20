import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
  confirmarNotificacion,
  getNotificacionesPendientes,
  marcarNotificacionLeida,
  type Notificacion,
} from "../../api/notificaciones";
import PostLoginNotificationModal from "./PostLoginNotificationModal";

function isInternalAppPath(value: unknown): value is string {
  const url = String(value || "").trim();
  return Boolean(url && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/api/") && !url.includes("\\"));
}

async function cerrarNotificacion(notificacion: Notificacion) {
  const id = String(notificacion?._id || "");
  if (!id) return;
  if (notificacion.requiereConfirmacion || notificacion.prioridad === "CRITICA") {
    await confirmarNotificacion(id);
  } else {
    await marcarNotificacionLeida(id);
  }
}

export default function NotificacionesPostLoginGate() {
  const { user, initialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificacion, setNotificacion] = useState<Notificacion | null>(null);
  const [busy, setBusy] = useState(false);
  const checkedUserRef = useRef("");

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

    getNotificacionesPendientes()
      .then((items) => {
        if (cancelado) return;
        const destacada = items.find((item) => item.prioridad === "CRITICA" || item.prioridad === "IMPORTANTE");
        setNotificacion(destacada || null);
      })
      .catch(() => {
        if (!cancelado) setNotificacion(null);
      });

    return () => {
      cancelado = true;
    };
  }, [puedeConsultar, userId]);

  if (!notificacion) return null;

  async function handleEntendido() {
    if (!notificacion || busy) return;
    setBusy(true);
    try {
      await cerrarNotificacion(notificacion);
      setNotificacion(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerAhora() {
    if (!notificacion || busy) return;
    const accionUrl = String(notificacion.accionUrl || "").trim();
    if (!isInternalAppPath(accionUrl)) {
      await handleEntendido();
      return;
    }

    setBusy(true);
    try {
      await cerrarNotificacion(notificacion);
      setNotificacion(null);
      navigate(accionUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PostLoginNotificationModal
      notificacion={notificacion}
      busy={busy}
      onEntendido={handleEntendido}
      onVerAhora={handleVerAhora}
    />
  );
}
