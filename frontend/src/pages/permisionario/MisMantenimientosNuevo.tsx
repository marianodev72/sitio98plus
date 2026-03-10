import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { crearMantenimiento, TipoMantenimiento } from "../../api/mantenimientos";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

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
      <div style={{ padding: 32 }}>
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

    // UX-only (backend valida). Limitamos a 6.
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

    // UX-only: validación básica de mime
    for (const f of files) {
      const mime = String((f as any).type || "");
      if (mime && mime !== "application/pdf") return setError("Solo se permiten archivos PDF.");
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
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h2>Cargar mantenimiento</h2>

      <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 10, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 800 }}>Vivienda</label>
            <input value="(autollenada por sistema)" readOnly style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontWeight: 800 }}>Permisionario</label>
            <input
              value={`${user?.apellido ?? ""} ${user?.nombre ?? ""}`.trim() || "(autollenado)"}
              readOnly
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 800 }}>Tipo de mantenimiento</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMantenimiento)} style={{ width: "100%" }}>
              <option value="MANTENIMIENTO_ARTEFACTOS_A_GAS">{labelTipo("MANTENIMIENTO_ARTEFACTOS_A_GAS")}</option>
              <option value="SISTEMA_DE_CALEFACCION_POR_CALDERA">{labelTipo("SISTEMA_DE_CALEFACCION_POR_CALDERA")}</option>
              <option value="DESAGUES">{labelTipo("DESAGUES")}</option>
              <option value="OTROS">{labelTipo("OTROS")}</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 800 }}>Técnico interviniente</label>
            <input
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              placeholder="(texto libre)"
              style={{ width: "100%" }}
              maxLength={200}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 800 }}>Documentación (PDF) — hasta {maxFiles}</label>
          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input type="file" accept="application/pdf" multiple onChange={onPickFiles} />
            <div style={{ opacity: 0.85 }}>
              {fileSummary.count} archivo(s) — {Math.round(fileSummary.total / 1024)} KB
            </div>
          </div>

          {files.length ? (
            <ul style={{ marginTop: 10 }}>
              {files.map((f, idx) => (
                <li key={`${f.name}-${idx}`} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span>{f.name}</span>
                  <button onClick={() => removeFile(idx)}>Quitar</button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.8 }}>No hay archivos seleccionados.</div>
          )}
        </div>

        {error ? (
          <div style={{ marginTop: 12, padding: 10, background: "#fff3f3", border: "1px solid #ffd1d1", borderRadius: 8 }}>
            <b>Error:</b> {error}
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={saving}>
            {saving ? "Enviando…" : "ENVIAR"}
          </button>
          <button onClick={() => navigate(-1)} disabled={saving}>Volver</button>
        </div>
      </div>
    </div>
  );
}
