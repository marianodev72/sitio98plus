export default function Estadisticas() {
  return (
    <>
      <h1>Estadísticas</h1>

      <p>
        Panel de información general: usuarios, viviendas, pedidos de trabajo, postulaciones, asignaciones, etc. Incluye
        porcentajes y gráficos (por ejemplo: Anexo 11 finalizados/pendientes/rechazados).
      </p>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd" }}>
        <strong>Estado:</strong>
        <p style={{ marginTop: 8 }}>
          Módulo preparado. Próximo paso: definir cuáles métricas se calculan en backend y cuál será el primer tablero
          institucional (por ejemplo, Anexo 11).
        </p>
      </div>
    </>
  );
}
