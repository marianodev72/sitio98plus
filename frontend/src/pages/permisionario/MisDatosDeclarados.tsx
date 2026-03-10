// frontend/src/pages/permisionario/MisDatosDeclarados.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

// Viewer institucional (el que ya usás para mostrar ANEXO_01 “lindo”)
import Anexo01Viewer from "../../components/anexos/Anexo01Viewer";

type AnexoDoc = {
  _id: string;
  codigo: string;
  estado?: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function isAprobado(a: any) {
  const e1 = up(a?.estado);
  const e2 = up(a?.estadoInstitucional);
  // soporta: "APROBADA", "APROBADO", "ENVIADO / APROBADA", etc.
  return e1.includes("APROB") || e2.includes("APROB");
}

export default function MisDatosDeclarados() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [anexo, setAnexo] = useState<AnexoDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);

    try {
      // Pedimos más de 1 para poder elegir el ÚLTIMO APROBADO
      const res = await http.get("/formularios/mis-anexos?codigo=ANEXO_01&limit=50");

      // ✅ Backend: { anexos: [...] }
      const anexos: AnexoDoc[] = Array.isArray(res.data?.anexos) ? res.data.anexos : [];

      // (debug opcional)
      // console.log("[MisDatosDeclarados] anexos:", anexos);

      const aprobados = anexos.filter(isAprobado);

      // Elegimos el más reciente por createdAt (fallback updatedAt)
      aprobados.sort((a: any, b: any) => {
        const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return tb - ta;
      });

      setAnexo(aprobados[0] || null);
    } catch (e: any) {
      setAnexo(null);
      setError(e?.response?.data?.message || "No se pudo cargar Mis Datos Declarados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div style={{ maxWidth: 980 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>Mis datos declarados</h2>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Se visualiza el último registro aprobado. Toda actualización queda registrada con fecha y hora.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => navigate("/app/permisionario")}>Volver</button>

          <button
            onClick={() => navigate("/app/permisionario/mis-datos/actualizar")}
            style={{ fontWeight: 900 }}
          >
            Actualizar mis datos
          </button>

          <button onClick={() => navigate("/app/permisionario/mis-datos/historial")}>
            Historial de actualizaciones
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? <div>Cargando…</div> : null}

        {error ? (
          <div
            style={{
              padding: 12,
              border: "1px solid #ffb3b3",
              background: "#fff3f3",
              borderRadius: 8,
            }}
          >
            <b>Error:</b> {error}
          </div>
        ) : null}

        {!loading && !error && !anexo ? (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            No hay datos declarados disponibles (no se encontró un ANEXO_01 aprobado).
          </div>
        ) : null}

        {!loading && !error && anexo ? (
          <div style={{ marginTop: 14 }}>
            {/* Le pasamos SOLO datos al viewer */}
            <Anexo01Viewer datos={anexo.datos || {}} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
