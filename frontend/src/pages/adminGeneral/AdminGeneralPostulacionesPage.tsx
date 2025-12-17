import { useEffect, useState } from "react";
import { getAnexosPorCodigo, type Anexo } from "../../api/formularios";

export default function AdminGeneralPostulacionesPage() {
  const [items, setItems] = useState<Anexo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnexosPorCodigo("ANEXO_01")
      .then(setItems)
      .catch(() => setError("Error cargando ANEXO 01"));
  }, []);

  if (error) return <div>{error}</div>;

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">POSTULACIONES – ANEXO 01</h1>

      {items.map((a: any) => (
        <div key={a._id} className="border p-3 rounded">
          <div className="font-semibold">
            {a.usuario?.apellido} {a.usuario?.nombre}
          </div>

          <div className="text-xs">Estado: {a.estado}</div>
          <div className="text-xs">Fecha: {new Date(a.createdAt).toLocaleString()}</div>

          {a.adjuntos?.length > 0 && (
            <div className="mt-2 text-xs">
              Adjuntos:
              <ul className="list-disc ml-4">
                {a.adjuntos.map((ad: any, i: number) => (
                  <li key={i}>
                    <a
                      href={`http://localhost:3000/${ad.ruta}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline"
                    >
                      {ad.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
