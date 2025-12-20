// src/pages/admin_general/AdminGeneralDashboard.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

export default function AdminGeneralDashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1>Panel ADMIN GENERAL</h1>

      <p>
        {user?.nombre} {user?.apellido}
      </p>

      <nav>
        <ul>
          <li>
            <Link to="/app/admin-general/viviendas">Viviendas</Link>
          </li>
          <li>
            <Link to="/app/admin-general/gestiones">Gestiones</Link>
          </li>
          <li>
            <Link to="/app/admin-general/usuarios">Usuarios</Link>
          </li>
          <li>
            <Link to="/app/admin-general/mensajeria">Mensajería</Link>
          </li>
          <li>
            <Link to="/app/admin-general/estadisticas">Estadísticas</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
