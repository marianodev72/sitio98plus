type Props = {
  datos: any;
};

function yn(v: any) {
  return v === true || v === "SI" ? "SI" : v === false || v === "NO" ? "NO" : "—";
}

function safe(v: any) {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s ? s : "—";
}

function row(label: string, value: any) {
  return (
    <tr>
      <td style={{ fontWeight: 700, padding: 6, width: 260 }}>{label}</td>
      <td style={{ padding: 6 }}>{safe(value)}</td>
    </tr>
  );
}

export default function Anexo01Viewer({ datos }: Props) {
  if (!datos) return <p>Sin datos.</p>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* CABECERA */}
      <section style={{ border: "1px solid #222", padding: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>
          ANEXO 01 — Formulario de Inscripción para ocupar Vivienda Fiscal
        </div>
        <div style={{ opacity: 0.85, marginTop: 6 }}>
          Declaración Jurada de Postulación
        </div>

        <div style={{ marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {row("Lugar", datos.lugar)}
              {row("Fecha", datos.fechaLugar)}
              {row("Autoridad de asignación", datos.autoridadAsignacion)}
              {row("Zona Naval", datos.zonaNaval)}
              {row("Tipo de solicitud", datos.tipoSolicitud)}
              {row("Acepta reglamento", yn(datos.aceptaReglamento))}
            </tbody>
          </table>
        </div>
      </section>

      {/* DATOS PERSONALES */}
      <section>
        <h4 style={{ marginBottom: 8 }}>Datos del solicitante</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {row("Apellido", datos.apellido)}
            {row("Nombres", datos.nombres)}
            {row("Grado / Escalafón", datos.gradoEscalafon)}
            {row("MR", datos.mr)}
            {row("Afiliado DIBA", datos.afiliadoDiba)}
            {row("Fecha último ascenso", datos.fechaUltimoAscenso)}
            {row("Años de servicio (recibo)", datos.aniosServicioRecibo)}
          </tbody>
        </table>
      </section>

      {/* DESTINOS */}
      <section>
        <h4 style={{ marginBottom: 8 }}>Destinos y contacto</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
        <h4 style={{ marginBottom: 8 }}>Grupo conviviente</h4>
        {Array.isArray(datos.convivientes) && datos.convivientes.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Apellido y nombres
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Relación / Parentesco
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Edad
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  DNI
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  A cargo
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.convivientes.map((c: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6 }}>{safe(c.apellidoNombres)}</td>
                  <td style={{ padding: 6 }}>{safe(c.relacion || c.parentesco)}</td>
                  <td style={{ padding: 6 }}>{safe(c.edad)}</td>
                  <td style={{ padding: 6 }}>{safe(c.dni)}</td>
                  <td style={{ padding: 6 }}>{safe(c.aCargo)}</td>
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
        <h4 style={{ marginBottom: 8 }}>Mascotas</h4>
        {Array.isArray(datos.mascotas) && datos.mascotas.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Especie
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Raza
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Sexo
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Edad
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Peso
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.mascotas.map((m: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6 }}>{safe(m.especie)}</td>
                  <td style={{ padding: 6 }}>{safe(m.raza)}</td>
                  <td style={{ padding: 6 }}>{safe(m.sexo)}</td>
                  <td style={{ padding: 6 }}>{safe(m.edad)}</td>
                  <td style={{ padding: 6 }}>{safe(m.peso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Sin mascotas declaradas.</p>
        )}
      </section>

      {/* PROPIEDADES */}
      <section>
        <h4 style={{ marginBottom: 8 }}>Propiedades declaradas</h4>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Tiene propiedades en zona: <b>{safe(datos.tienePropiedadesZona)}</b>
          </li>
          <li>
            Verificó Art. 5.06: <b>{safe(datos.verificoArticulo506)}</b>
          </li>
        </ul>

        {Array.isArray(datos.propiedades) && datos.propiedades.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Dirección
                </th>
                <th style={{ borderBottom: "1px solid #222", textAlign: "left", padding: 6 }}>
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.propiedades.map((p: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: 6 }}>{safe(p.direccion)}</td>
                  <td style={{ padding: 6 }}>{safe(p.observaciones)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: 10 }}>Sin propiedades cargadas.</p>
        )}
      </section>

      {/* DECLARACIONES */}
      <section>
        <h4 style={{ marginBottom: 8 }}>Declaraciones</h4>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Acepta reglamento: <b>{yn(datos.aceptaReglamento)}</b>
          </li>
          <li>
            Autoriza descuentos: <b>{yn(datos.autorizaDescuentos)}</b>
          </li>
          <li>
            Autoriza administrador expensas: <b>{yn(datos.autorizaAdministradorExpensas)}</b>
          </li>
        </ul>
      </section>
    </div>
  );
}
