import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

type Opcion =
  | string
  | {
      valor: string;
      etiqueta: string;
    };

type Campo = {
  nombre: string;
  etiqueta: string;
  tipo: "text" | "textarea" | "select";
  requerido: boolean;
  opciones?: Opcion[];
};

export default function NuevaPostulacion() {
  const navigate = useNavigate();

  const [campos, setCampos] = useState<Campo[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarTemplate() {
      try {
        const res = await http.get("/templates/ANEXO_01");

        const template = res.data?.template || res.data;

        if (!template || !Array.isArray(template.campos)) {
          throw new Error("Template inválido");
        }

        setCampos(template.campos);
      } catch {
        setError(
          "No se ha podido procesar su solicitud, contacte al administrador."
        );
      }
    }

    cargarTemplate();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await http.post("/formularios/ANEXO_01", {
        datos: form,
      });

      navigate("/app/postulante", { replace: true });
    } catch {
      setError(
        "No se ha podido procesar su solicitud, contacte al administrador."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h2>Postulación a Vivienda Fiscal</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {campos.map((campo) => (
          <div key={campo.nombre} style={{ marginBottom: 16 }}>
            <label>
              {campo.etiqueta}
              {campo.requerido && " *"}
            </label>

            {campo.tipo === "text" && (
              <input
                type="text"
                name={campo.nombre}
                value={form[campo.nombre] || ""}
                onChange={handleChange}
                required={campo.requerido}
              />
            )}

            {campo.tipo === "textarea" && (
              <textarea
                name={campo.nombre}
                value={form[campo.nombre] || ""}
                onChange={handleChange}
                required={campo.requerido}
              />
            )}

            {campo.tipo === "select" && (
              <select
                name={campo.nombre}
                value={form[campo.nombre] || ""}
                onChange={handleChange}
                required={campo.requerido}
              >
                <option value="">Seleccione...</option>

                {campo.opciones?.map((op) => {
                  if (typeof op === "string") {
                    return (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    );
                  }

                  return (
                    <option key={op.valor} value={op.valor}>
                      {op.etiqueta}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        ))}

        <button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar postulación"}
        </button>
      </form>
    </div>
  );
}
