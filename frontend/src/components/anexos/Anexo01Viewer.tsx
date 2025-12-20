type Props = {
  datos: any;
};

function yn(v: any) {
  return v === true || v === "SI" ? "SI" : v === false || v === "NO" ? "NO" : "—";
}

function row(label: string, value: any) {
  return (
    <tr>
      <td style={{ fontWeight: 600, padding: 6 }}>{label}</td>
      <td style={{ padding: 6 }}>{value || "—"}</td>
    </tr>
  );
}

export default function Anexo01Viewer({ datos }: Props) {
  if (!datos) return <p>Sin datos.</p>;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* DATOS PERSONALES */}
      <section>
        <h4>Datos del solicitante</h4>
        <table>
          <tbody>
            {row("Apellido", datos.apellido)}
            {row("Nombres", datos.nombres)}
            {row("Grado / Escalafón", datos.gradoEscalafon)}
            {row("MR", datos.mr)}
            {row("Afiliado DIBA", datos.afiliadoDiba)}
          </tbody>
        </table>
      </section>

      {/* DESTINOS */}
      <section>
        <h4>Destinos</h4>
        <table>
          <tbody>
            {row("Destino actual", datos.destinoActual)}
            {row("Teléfono actual", datos.telefonoActual)}
            {row("Destino futuro", datos.destinoFuturo)}
            {row("Teléfono futuro", datos.telefonoFuturo)}
          </tbody>
        </table>
      </section>

      {/* CONVIVIENTES */}
      <section>
        <h4>Grupo conviviente</h4>
        {Array.isArray(datos.convivientes) && datos.convivientes.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Apellido y nombres</th>
                <th>Parentesco</th>
                <th>Edad</th>
              </tr>
            </thead>
            <tbody>
              {datos.convivientes.map((c: any, i: number) => (
                <tr key={i}>
                  <td>{c.apellidoNombres || "—"}</td>
                  <td>{c.parentesco || "—"}</td>
                  <td>{c.edad || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Sin convivientes declarados.</p>
        )}
      </section>

      {/* MASCOTAS */}
      <section>
        <h4>Mascotas</h4>
        {Array.isArray(datos.mascotas) && datos.mascotas.length > 0 ? (
          <ul>
            {datos.mascotas.map((m: any, i: number) => (
              <li key={i}>
                {m.tipo || "Mascota"} – {m.observaciones || "—"}
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin mascotas declaradas.</p>
        )}
      </section>

      {/* DECLARACIONES */}
      <section>
        <h4>Declaraciones</h4>
        <ul>
          <li>Acepta reglamento: <b>{yn(datos.aceptaReglamento)}</b></li>
          <li>Autoriza descuentos: <b>{yn(datos.autorizaDescuentos)}</b></li>
          <li>Autoriza administrador expensas: <b>{yn(datos.autorizaAdministradorExpensas)}</b></li>
        </ul>
      </section>
    </div>
  );
}
