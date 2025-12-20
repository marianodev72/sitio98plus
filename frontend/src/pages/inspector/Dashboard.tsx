import { useAuth } from "../../auth/useAuth";

export default function InspectorDashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1>Panel INSPECTOR</h1>
      <p>
        Usuario: {user?.nombre} {user?.apellido} — <b>{user?.role}</b>
      </p>
      <p>(FASE 3A) Estructura base creada. Funcionalidades pendientes.</p>
    </>
  );
}
