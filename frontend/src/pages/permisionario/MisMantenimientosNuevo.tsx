// frontend/src/pages/permisionario/MisMantenimientosNuevo.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { crearMantenimiento, TipoMantenimiento } from "../../api/mantenimientos";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILE_SIZE_MESSAGE = `Cada archivo PDF debe pesar como máximo ${MAX_FILE_SIZE_MB} MB.`;

const GENERIC_UI_ERROR =
  "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function labelTipo(t: TipoMantenimiento) {
  switch (t) {
    case "MANTENIMIENTO_ARTEFACTOS_A_GAS":
      return "MANTENIMIENTO ARTEFACTOS A GAS";
    case "SISTEMA_DE_CALEFACCION_POR_CALDERA":
      return "SISTEMA DE CALEFACCION POR CALDERA";
    case "DESAGUES":
      return "DESAGUES";
    case "OTROS":
      return "OTROS";
  }
}

const styles = {
  page: {
    maxWidth: 1100,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  denied: {
    padding: 32,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  hero: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
    marginBottom: 16,
  } as React.CSSProperties,

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
  } as React.CSSProperties,

  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#ffffff",
  } as React.CSSProperties,

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 1.55,
    maxWidth: 900,
  } as React.CSSProperties,

  shell: {
    display: "grid",
    gap: 16,
  } as React.CSSProperties,

  card: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  } as React.CSSProperties,

  cardTitle: {
    margin: 0,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#fff",
  } as React.CSSProperties,

  cardText: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.55,
    fontSize: 14,
  } as React.CSSProperties,

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginTop: 14,
  } as React.CSSProperties,

  field: {
    display: "grid",
    gap: 6,
  } as React.CSSProperties,

  fieldFull: {
    display: "grid",
    gap: 6,
    gridColumn: "1 / -1",
  } as React.CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.58)",
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,

  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundColor: "#111827",
    color: "#F8FAFC",
    fontSize: 14,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    colorScheme: "dark",
  } as React.CSSProperties,

  option: {
    backgroundColor: "#1f2937",
    color: "#ffffff",
  } as React.CSSProperties,

  readonlyInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,

  uploadBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  uploadHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap" as const,
    alignItems: "center",
    marginTop: 8,
  } as React.CSSProperties,

  helper: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
  } as React.CSSProperties,

  fileList: {
    marginTop: 12,
    display: "grid",
    gap: 8,
    padding: 0,
    listStyle: "none",
  } as React.CSSProperties,

  fileItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  fileName: {
    color: "rgba(255,255,255,0.92)",
    lineHeight: 1.45,
    wordBreak: "break-word" as const,
  } as React.CSSProperties,

  emptyFiles: {
    marginTop: 10,
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
  } as React.CSSProperties,

  alertError: {
    marginTop: 12,
    padding: 12,
    border: "1px solid rgba(244,67,54,0.6)",
    background: "rgba(244,67,54,0.12)",
    borderRadius: 12,
    color: "#ffe5e5",
  } as React.CSSProperties,

  buttonRow: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  primaryButton: {
    border: "1px solid rgba(59,130,246,0.9)",
    background: "linear-gradient(180deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37,99,235,0.28)",
  } as React.CSSProperties,

  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  dangerButton: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.12)",
    color: "#ffe1e1",
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
};

export default function MisMantenimientosNuevo() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState<TipoMantenimiento>("DESAGUES");
  const [tecnico, setTecnico] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={styles.denied}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const maxFiles = 6;

  const fileSummary = useMemo(() => {
    const total = files.reduce((a, f) => a + (f.size || 0), 0);
    return { count: files.length, total };
  }, [files]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const arr = Array.from(e.target.files || []);
    if (!arr.length) return;

    const next = [...files, ...arr].slice(0, maxFiles);
    setFiles(next);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles(files.filter((_, i) => i !== idx));
  }

  async function submit() {
    setError("");
    if (files.length === 0) return setError("Debe adjuntar al menos un PDF.");
    if (files.length > maxFiles) return setError(`Máximo ${maxFiles} PDFs.`);

    for (const f of files) {
      const mime = String((f as any).type || "");
      if (mime && mime !== "application/pdf") {
        return setError("Solo se permiten archivos PDF.");
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        return setError(MAX_FILE_SIZE_MESSAGE);
      }
    }

    setSaving(true);
    try {
      await crearMantenimiento({
        tipoMantenimiento: tipo,
        tecnicoInterviniente: tecnico,
        archivos: files,
      });
      navigate("/app/permisionario/mis-mantenimientos/listado", { replace: true });
    } catch (e: any) {
      setError(e?.message || GENERIC_UI_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Cargar mantenimiento</h2>
            <div style={styles.subtitle}>
              Registrá una nueva solicitud de mantenimiento. La vivienda y el permisionario se
              completan automáticamente y la documentación debe adjuntarse en PDF.
            </div>
          </div>
        </div>
      </div>

      <div style={styles.shell}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Datos de la solicitud</h3>
          <div style={styles.cardText}>
            Completá el tipo de mantenimiento, el técnico interviniente y la documentación
            respaldatoria.
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Vivienda</label>
              <input
                value="(autollenada por sistema)"
                readOnly
                style={styles.readonlyInput}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Permisionario</label>
              <input
                value={`${user?.apellido ?? ""} ${user?.nombre ?? ""}`.trim() || "(autollenado)"}
                readOnly
                style={styles.readonlyInput}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Tipo de mantenimiento</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoMantenimiento)}
                style={styles.select}
              >
                <option value="MANTENIMIENTO_ARTEFACTOS_A_GAS" style={styles.option}>
                  {labelTipo("MANTENIMIENTO_ARTEFACTOS_A_GAS")}
                </option>
                <option value="SISTEMA_DE_CALEFACCION_POR_CALDERA" style={styles.option}>
                  {labelTipo("SISTEMA_DE_CALEFACCION_POR_CALDERA")}
                </option>
                <option value="DESAGUES" style={styles.option}>{labelTipo("DESAGUES")}</option>
                <option value="OTROS" style={styles.option}>{labelTipo("OTROS")}</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Técnico interviniente</label>
              <input
                value={tecnico}
                onChange={(e) => setTecnico(e.target.value)}
                placeholder="(texto libre)"
                style={styles.input}
                maxLength={200}
              />
            </div>
          </div>

          <div style={styles.uploadBox}>
            <label style={styles.label}>Documentación (PDF) — hasta {maxFiles}</label>

            <div style={styles.uploadHeader}>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={onPickFiles}
                style={styles.input}
              />
              <div style={styles.helper}>
                {fileSummary.count} archivo(s) — {Math.round(fileSummary.total / 1024)} KB
              </div>
            </div>

            {files.length ? (
              <ul style={styles.fileList}>
                {files.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} style={styles.fileItem}>
                    <span style={styles.fileName}>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={styles.dangerButton}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={styles.emptyFiles}>No hay archivos seleccionados.</div>
            )}
          </div>

          {error ? (
            <div style={styles.alertError}>
              <b>Error:</b> {error}
            </div>
          ) : null}

          <div style={styles.buttonRow}>
            <button onClick={submit} disabled={saving} style={styles.primaryButton}>
              {saving ? "Enviando…" : "ENVIAR"}
            </button>
            <button
              onClick={() => navigate(-1)}
              disabled={saving}
              style={styles.secondaryButton}
            >
              Volver
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
