import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleBadge({ role }) {
  if (!role) return null;
  return (
    <span className="ml-2 rounded-full bg-goldSoft/10 px-3 py-1 text-xs font-semibold text-gold border border-gold/40">
      {role}
    </span>
  );
}

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-slate-900 to-background">
      {/* Header */}
      <header className="border-b border-slate-800 bg-navy/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo + títulos */}
          <div className="flex items-center gap-3">
            {/* Escudos – aquí luego podemos poner <img src="..." /> con los escudos reales */}
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                EA
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                BNU
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-300">
                BASE NAVAL USHUAIA
              </span>
              <span className="text-lg font-bold text-gold">
                ALCALDÍA ZN98
              </span>
              <span className="text-[0.75rem] text-slate-300">
                Órgano Administrador de Viviendas Fiscales ZN98
              </span>
            </div>
          </div>

          {/* Navegación derecha */}
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `hover:text-gold ${isActive ? "text-gold" : "text-slate-200"}`
                }
              >
                Inicio
              </NavLink>
              {isAuthenticated && (
                <NavLink
                  to="/panel"
                  className={({ isActive }) =>
                    `hover:text-gold ${
                      isActive ? "text-gold" : "text-slate-200"
                    }`
                  }
                >
                  Mi panel
                </NavLink>
              )}
            </nav>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-300">
                    {user?.nombre} {user?.apellido}
                  </div>
                  <div className="text-[0.7rem] text-slate-400">
                    {user?.email}
                  </div>
                </div>
                <RoleBadge role={user?.role} />
                <button
                  onClick={logout}
                  className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-gold hover:text-gold transition"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-goldSoft transition"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-navy/90 mt-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} Alcaldía ZN98 · Base Naval Ushuaia
          </span>
          <span>
            Sistema interno para viviendas fiscales y alojamientos navales
          </span>
        </div>
      </footer>
    </div>
  );
}
