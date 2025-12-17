import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useNavigate } from "react-router-dom";

export default function PostulanteAnexo01Page() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [datos, setDatos] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      const res = await apiClient.get("/formularios/anexo/ANEXO_01");
      setTemplate(res.data.anexos?.[0]?.template || res.data.template);
    };
    loadTemplate();
  }, []);

  const handleChange = (name: string, value: any) => {
    setDatos((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiClient.post("/formularios/ANEXO_01", {
        datos,
      });
      navigate("/app/postulante");
    } catch (err) {
      alert("Error enviando la postulación");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!template) {
    return <div className="text-sm text-slate-400">Cargando formulario…</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        {template.nombre}
      </h1>

      {template.campos.map((campo: any) => (
        <div key={campo.nombre} className="space-y-1">
          <label className="text-xs text-slate-300">
            {campo.etiqueta}
            {campo.requerido && " *"}
          </label>

          {campo.tipo === "textarea" && (
            <textarea
              className="w-full rounded bg-slate-800 p-2 text-sm"
              onChange={(e) =>
                handleChange(campo.nombre, e.target.value)
              }
            />
          )}

          {campo.tipo === "select" && (
            <select
              className="w-full rounded bg-slate-800 p-2 text-sm"
              onChange={(e) =>
                handleChange(campo.nombre, e.target.value)
              }
            >
              <option value="">Seleccionar</option>
              {campo.opciones?.map((o: any) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          )}

          {["text", "number", "date"].includes(campo.tipo) && (
            <input
              type={campo.tipo}
              className="w-full rounded bg-slate-800 p-2 text-sm"
              onChange={(e) =>
                handleChange(campo.nombre, e.target.value)
              }
            />
          )}
        </div>
      ))}

      <button
        disabled={submitting}
        onClick={handleSubmit}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        Enviar postulación
      </button>
    </div>
  );
}
