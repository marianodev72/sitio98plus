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
            <Link to="/panel/admin-general/viviendas">Viviendas</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
