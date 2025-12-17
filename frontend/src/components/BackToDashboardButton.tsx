import { useNavigate } from "react-router-dom";

export function BackToDashboardButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/app/admin-general")}
      className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs md:text-sm text-slate-200 hover:bg-slate-800 transition mb-4"
    >
      <span>←</span>
      <span>Volver al dashboard</span>
    </button>
  );
}
