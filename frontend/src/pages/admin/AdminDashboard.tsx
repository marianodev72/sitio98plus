// frontend/src/pages/admin/AdminDashboard.tsx
import { useAuth } from "../../auth/useAuth";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1>Panel ADMIN</h1>
      <p>
        Usuario: {user?.nombre} {user?.apellido} — <b>{user?.role}</b>
      </p>
      <p>Acceso de solo lectura a Usuarios, Viviendas, Gestiones y Liquidaciones. Mensajería habilitada.</p>
<p>
  Ir a: <a href="/app/admin/liquidaciones">Liquidaciones</a>
</p>
    </>
  );
}
