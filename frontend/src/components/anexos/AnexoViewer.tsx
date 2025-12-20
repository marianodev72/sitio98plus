// frontend/src/components/anexos/AnexoViewer.tsx
import Anexo01Viewer from "./Anexo01Viewer";
import TemplateViewer from "./TemplateViewer";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function AnexoViewer({
  codigo,
  datos,
}: {
  codigo: string;
  datos: any;
}) {
  const c = up(codigo);

  // Visores “institucionales” hechos a mano
  if (c === "ANEXO_01") {
    return <Anexo01Viewer datos={datos} />;
  }

  // Fallback genérico por template
  return <TemplateViewer codigo={c} datos={datos} />;
}
