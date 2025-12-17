import InstitutionalHeader from "../../components/layout/InstitutionalHeader";

export default function AdminUsuarios() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <InstitutionalHeader />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Usuarios y roles</h1>
        <p className="text-slate-300">
          Módulo para administrar cuentas y roles (en construcción).
        </p>
      </div>
    </div>
  );
}
