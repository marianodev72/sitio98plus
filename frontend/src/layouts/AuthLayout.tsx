import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function AuthLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <>
      <header style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
        <button onClick={() => navigate(-1)}>🔙 Volver atrás</button>
        <button onClick={handleLogout} style={{ marginLeft: "1rem" }}>
          🔒 Cerrar sesión
        </button>
      </header>
      <main style={{ padding: "2rem" }}>
        <Outlet />
      </main>
    </>
  );
}
