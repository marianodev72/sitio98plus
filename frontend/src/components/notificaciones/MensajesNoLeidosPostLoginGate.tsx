import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getResumenMensajesNoLeidos } from "../../api/mensajes";
import { useAuth } from "../../auth/useAuth";
import PostLoginNotificationModal from "./PostLoginNotificationModal";

type MensajeAlerta = {
  _id: string;
  titulo: string;
  mensaje: string;
  accionTexto: string;
  accionUrl: string;
  tipo: string;
  prioridad: "IMPORTANTE";
  requiereConfirmacion: false;
};

function up(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((item: unknown) => up(item)).includes(up(permiso));
}

function tieneTerritorioLugar(user: any) {
  return Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento.some(
        (territorio: any) => up(territorio?.tipo) === "LUGAR" && String(territorio?.valor || "").trim()
      )
    : false;
}

function rutaMensajeriaParaUsuario(user: any) {
  const role = up(user?.role);

  if (role === "ADMIN_GENERAL") return "/app/admin-general/mensajeria";
  if (role === "ADMIN") return "/app/admin/mensajeria";
  if (role === "ALOJADO") return "/app/alojado/comunicaciones";
  if (role === "INSPECTOR_ALOJAMIENTOS" || hasPermiso(user, "INSPECTOR_ALOJAMIENTOS")) {
    return tieneTerritorioLugar(user) ? "/app/permisionario/alojamientos-inspector/comunicaciones" : "";
  }

  if (role === "PERMISIONARIO") {
    if (hasPermiso(user, "JEFE_DE_BARRIO")) return "/app/permisionario/mi-barrio-jefe/mensajeria";
    if (hasPermiso(user, "INSPECTOR")) return "/app/permisionario/mi-barrio-inspector/mensajeria";
    return "/app/permisionario/comunicaciones";
  }

  return "";
}

function isPostLoginModalActivo() {
  return Boolean((window as any).__sitio98PostLoginModalActivo);
}

export default function MensajesNoLeidosPostLoginGate() {
  const { user, initialized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const checkedUserRef = useRef("");
  const [alerta, setAlerta] = useState<MensajeAlerta | null>(null);

  const userId = String(user?._id || "");
  const puedeConsultar = useMemo(() => {
    if (!initialized || !userId) return false;
    if (user?.mustChangePassword === true) return false;
    if (location.pathname === "/login" || location.pathname === "/change-password") return false;
    return Boolean(rutaMensajeriaParaUsuario(user));
  }, [initialized, location.pathname, user, userId]);

  useEffect(() => {
    if (!puedeConsultar) return;
    if (checkedUserRef.current === userId) return;

    checkedUserRef.current = userId;
    let cancelado = false;

    const timer = window.setTimeout(() => {
      getResumenMensajesNoLeidos()
        .then((resumen) => {
          if (cancelado || isPostLoginModalActivo()) return;

          const total = Number(resumen.totalNoLeidos || 0);
          const accionUrl = rutaMensajeriaParaUsuario(user);
          if (total <= 0 || !accionUrl) return;

          setAlerta({
            _id: "mensajes-no-leidos",
            titulo: "Tiene mensajes sin leer",
            mensaje: `Tiene ${total} mensaje(s) institucional(es) pendiente(s) de lectura.`,
            accionTexto: "Ingrese a Mensajeria para revisar su bandeja.",
            accionUrl,
            tipo: "MENSAJES_NO_LEIDOS",
            prioridad: "IMPORTANTE",
            requiereConfirmacion: false,
          });
        })
        .catch(() => {
          if (!cancelado) setAlerta(null);
        });
    }, 650);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [puedeConsultar, user, userId]);

  if (!alerta) return null;

  function cerrar() {
    setAlerta(null);
  }

  function irAMensajeria() {
    const accionUrl = alerta.accionUrl;
    setAlerta(null);
    navigate(accionUrl);
  }

  return (
    <PostLoginNotificationModal
      notificacion={alerta}
      onEntendido={cerrar}
      onVerAhora={irAMensajeria}
      entendidoTexto="Mas tarde"
      verAhoraTexto="Ir a Mensajeria"
    />
  );
}
