// frontend/src/pages/permisionario/inspector/ViviendasInspector.tsx

import Viviendas from "../../admin_general/Viviendas";
import { useAuth } from "../../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  const p = up(perm);
  return list.map((x: any) => up(x)).includes(p);
}

/**
 * ViviendasInspector
 * ------------------
 * - Reutiliza el módulo Viviendas (ADMIN_GENERAL)
 * - Inspector-like: PERMISIONARIO con permiso INSPECTOR, o role INSPECTOR si existiera
 * - SOLO visualización (readOnly)
 * - El backend filtra por barrioAsignado del inspector-like
 */
export default function ViviendasInspector() {
  const { user } = useAuth();

  const role = up(user?.role);
  const inspectorLike = role === "INSPECTOR" || hasPerm(user, "INSPECTOR");

  if (!user || !inspectorLike) {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  // readOnly evita cambios de estado desde UI
  return <Viviendas readOnly />;
}
