// src/layouts/AdminGeneralLayout.tsx
import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { useAuth } from "../auth/useAuth";

export default function AdminGeneralLayout() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();

  // 🔒 Guard institucional: SOLO ADMIN_GENERAL
  useEffect(() => {
    let alive = true;

    (async () => {
      // Si el user todavía no está cargado, intentamos refrescar sesión
      if (!user) {
        try {
          await refresh();
        } catch {
          // silencio
        }
      }

      if (!alive) return;

      const role = String(user?.role || "").toUpperCase();
      if (role !== "ADMIN_GENERAL") {
        navigate("/login", { replace: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, refresh, navigate]);

  async function cerrarSesion() {
    try {
      await http.post("/auth/logout");
    } catch {
      // silencio
    } finally {
      try {
        await logout(); // limpia estado local
      } catch {
        // silencio
      }
      navigate("/login", { replace: true });
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #ddd",
        }}
      >
        <button onClick={() => navigate(-1)}>← Volver</button>
        <strong>Sitio 98</strong>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      <nav
        style={{
          display: "flex",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid #eee",
          flexWrap: "wrap",
        }}
      >
        <Link to="/app/admin-general/viviendas">Viviendas</Link>
        <Link to="/app/admin-general/mensajeria">Mensajería</Link>
        <Link to="/app/admin-general/gestiones">Gestiones</Link>
        <Link to="/app/admin-general/usuarios">Usuarios</Link>
        <Link to="/app/admin-general/estadisticas">Estadísticas</Link>
      </nav>

      <main style={{ flex: 1, padding: "16px" }}>
        <Outlet />
      </main>
    </div>
  );
}
