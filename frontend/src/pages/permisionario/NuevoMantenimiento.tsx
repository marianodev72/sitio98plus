// frontend/src/pages/permisionario/NuevoMantenimiento.tsx
import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { crearMantenimiento } from "../../api/misMantenimientos";
import { useAuth } from "../../auth/useAuth";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

const selectStyle: CSSProperties = {
  width: "100%",
  padding: 8,
  border: "1px solid #475569",
  borderRadius: 8,
  backgroundColor: "#111827",
  color: "#F8FAFC",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  colorScheme: "dark",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

export default function NuevoMantenimiento() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [tipo, setTipo] = useState("MANTENIMIENTO_ARTEFACTOS_A_GAS");
  const [tecnico, setTecnico] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  const vivienda = useMemo(() => String(user?.viviendaAsignada || "").trim(), [user]);
  const permisionario = useMemo(
    () => `${String(user?.apellido || "").trim()} ${String(user?.nombre || "").trim()}`.trim(),
    [user]
  );

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []);
    const onlyPdf = list.filter((f) => f.type === "application/pdf");
    setFiles(onlyPdf.slice(0, 6));
  }

  async function onSubmit() {
    setUiError(null);

    if (!files.length) {
      setUiError("Debe adjuntar al menos un PDF.");
      return;
    }
    if (files.length > 6) {
      setUiError("Máximo 6 PDFs por mantenimiento.");
      return;
    }

    try {
      setSubmitting(true);
      await crearMantenimiento({
        tipoMantenimiento: tipo,
        tecnicoInterviniente: tecnico,
        archivos: files,
      });
      nav("/app/permisionario/mis-mantenimientos/historial", { replace: true });
    } catch {
      // Fail-closed: mensaje opaco
      setUiError(GENERIC_UI_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2>Cargar mantenimiento</h2>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        <div><b>Vivienda</b>: {vivienda || "Autocompletada por sistema"}</div>
        <div><b>Permisionario</b>: {permisionario || "Autocompletado por sistema"}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 800 }}>Tipo de mantenimiento</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={selectStyle}>
          <option value="MANTENIMIENTO_ARTEFACTOS_A_GAS" style={optionStyle}>Mantenimiento artefactos a gas</option>
          <option value="SISTEMA_DE_CALEFACCION_POR_CALDERA" style={optionStyle}>Sistema de calefacción por caldera</option>
          <option value="DESAGUES" style={optionStyle}>Desagües</option>
          <option value="OTROS" style={optionStyle}>Otros</option>
        </select>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 800 }}>Técnico interviniente</label>
        <input
          value={tecnico}
          onChange={(e) => setTecnico(e.target.value)}
          placeholder="Apellido y nombre / Razón social"
          style={{ width: "100%", padding: 8 }}
          maxLength={200}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 800 }}>Adjuntar documentación (PDF)</label>
        <input type="file" accept="application/pdf" multiple onChange={onPickFiles} />
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Se permiten hasta 6 PDFs.
        </div>

        {files.length ? (
          <ul>
            {files.map((f) => (
              <li key={f.name}>{f.name} ({Math.round(f.size / 1024)} KB)</li>
            ))}
          </ul>
        ) : null}
      </div>

      {uiError ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          {uiError}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={() => nav("/app/permisionario/mis-mantenimientos")}>Volver</button>
        <button onClick={onSubmit} disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
