import { useAuth } from "../../auth/useAuth";

export default function JefeDeBarrioDashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1>Panel JEFE_DE_BARRIO</h1>
      <p>
        Usuario: {user?.nombre} {user?.apellido} — <b>{user?.role}</b>
      </p>
      <p>(FASE 3A) Estructura base creada. Funcionalidades pendientes.</p>
    </>
  );
}
