type Campo = {
  nombre: string;
  etiqueta: string;
  tipo: string;
  requerido?: boolean;
  opciones?: { valor: string; etiqueta: string }[];
};

export function DynamicForm({
  campos,
  onChange,
}: {
  campos: Campo[];
  onChange: (name: string, value: any) => void;
}) {
  return (
    <>
      {campos.map((c) => (
        <div key={c.nombre}>
          <label>{c.etiqueta}</label>

          {c.tipo === "textarea" && (
            <textarea onChange={(e) => onChange(c.nombre, e.target.value)} />
          )}

          {c.tipo === "select" && (
            <select onChange={(e) => onChange(c.nombre, e.target.value)}>
              <option value="">Seleccione</option>
              {c.opciones?.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          )}

          {c.tipo === "text" && (
            <input
              type="text"
              onChange={(e) => onChange(c.nombre, e.target.value)}
            />
          )}
        </div>
      ))}
    </>
  );
}
