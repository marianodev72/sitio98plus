export default function FormularioRenderer({ schema, register }) {
  return (
    <div>
      {schema.map((campo) => (
        <div key={campo.id}>
          <label>{campo.label}</label>

          {campo.tipo === "text" && (
            <input {...register(campo.id)} className="input" />
          )}

          {campo.tipo === "select" && (
            <select {...register(campo.id)} className="input">
              {campo.opciones.map((o) => (
                <option value={o}>{o}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
