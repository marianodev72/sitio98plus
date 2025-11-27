// src/components/home/RoleCards.jsx
import { Users, Home, Shield } from "lucide-react";

export default function RoleCards() {
  const roles = [
    {
      name: "Permisionarios",
      icon: <Home size={48} />,
      color: "from-blue-600 to-blue-800",
      path: "/permisionarios/login",
    },
    {
      name: "Alojados",
      icon: <Users size={48} />,
      color: "from-emerald-600 to-emerald-800",
      path: "/alojados/login",
    },
    {
      name: "Administración",
      icon: <Shield size={48} />,
      color: "from-indigo-600 to-indigo-800",
      path: "/admin/login",
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto mt-12 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((role) => (
          <a
            key={role.name}
            href={role.path}
            className={`
              group relative overflow-hidden rounded-2xl
              bg-gradient-to-br ${role.color}
              shadow-xl shadow-black/40
              border border-white/10
              p-6 flex flex-col items-start
              transition-transform transition-shadow duration-300
              hover:-translate-y-1 hover:shadow-2xl
            `}
          >
            {/* Círculo decorativo */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

            {/* Icono */}
            <div className="relative mb-4 text-white">
              {role.icon}
            </div>

            {/* Título */}
            <h3 className="relative text-xl font-semibold text-white mb-2">
              {role.name}
            </h3>

            {/* Descripción corta */}
            <p className="relative text-sm text-white/80">
              Acceso exclusivo al módulo de {role.name.toLowerCase()} del portal.
            </p>

            {/* Botón */}
            <div
              className="
                relative mt-4 px-6 py-2
                bg-white/20
                text-white
                rounded-lg
                font-medium
                transition-all
                hover:bg-white/30
              "
            >
              Ingresar
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
