// src/pages/admin_general/AdminGeneralDashboard.tsx
 
import { useAuth } from "../../auth/useAuth";

export default function AdminGeneralDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
        Panel ADMIN GENERAL
      </h1>

      <p style={{ opacity: 0.8 }}>
        {user?.nombre} {user?.apellido}
      </p>

      {/* Contenido futuro del dashboard */}
    </div>
  );
}
