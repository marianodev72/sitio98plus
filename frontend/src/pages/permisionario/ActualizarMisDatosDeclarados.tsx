import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

type Campo = { key: string; label: string };

type Conviviente = {
  parentesco?: string;
  apellido?: string;
  nombre?: string;
  dni?: string;
  edad?: string;
  observaciones?: string;
};

type Mascota = {
  tipo?: string;
  nombre?: string;
  observaciones?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function isAprobado(a: any) {
  const e1 = up(a?.estado);
  const e2 = up(a?.estadoInstitucional);
  return e1.includes("APROB") || e2.includes("APROB");
}

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

const styles = {
  page: {
    maxWidth: 1180,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
    marginBottom: 18,
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

  buttonRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
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
  } as React.CSSProperties,

  shell: {
    display: "grid",
    gap: 16,
  } as React.CSSProperties,

  alertError: {
    marginTop: 10,
    padding: 12,
    border: "1px solid rgba(244,67,54,0.6)",
    background: "rgba(244,67,54,0.12)",
    borderRadius: 12,
    color: "#ffe5e5",
  } as React.CSSProperties,

  alertOk: {
    marginTop: 10,
    padding: 12,
    border: "1px solid rgba(76,175,80,0.55)",
    background: "rgba(76,175,80,0.12)",
    borderRadius: 12,
    color: "#e8ffe8",
  } as React.CSSProperties,

  emptyState: {
    padding: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.82)",
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
    marginBottom: 14,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#fff",
  } as React.CSSProperties,

  cardSubtle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    marginBottom: 12,
  } as React.CSSProperties,

  sectionDivider: {
    height: 1,
    border: "none",
    margin: "18px 0",
    background: "rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  formGrid: {
    display: "grid",
    gap: 12,
  } as React.CSSProperties,

  fieldRow: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 12,
    alignItems: "center",
  } as React.CSSProperties,

  fieldRowTop: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 12,
    alignItems: "start",
  } as React.CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.6)",
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    fontSize: 14,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    fontSize: 14,
    resize: "vertical" as const,
    minHeight: 88,
  } as React.CSSProperties,

  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap" as const,
    marginBottom: 12,
  } as React.CSSProperties,

  tableWrap: {
    marginTop: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflowX: "auto" as const,
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: 920,
  } as React.CSSProperties,

  th: {
    textAlign: "left" as const,
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.6)",
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  td: {
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top" as const,
  } as React.CSSProperties,

  emptyTableRow: {
    padding: 14,
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  } as React.CSSProperties,

  note: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 1.45,
  } as React.CSSProperties,
};

export default function ActualizarMisDatosDeclarados() {
  const navigate = useNavigate();

  const campos: Campo[] = useMemo(
    () => [
      { key: "gradoEscalafon", label: "Grado / Escalafón" },
      { key: "matricula", label: "Matrícula" },
      { key: "apellido", label: "Apellido" },
      { key: "nombres", label: "Nombres" },
      { key: "aniosServicioRecibo", label: "Años de servicio" },
      { key: "destinoActual", label: "Destino (lugar de trabajo)" },
      { key: "telefonoActual", label: "Teléfono de contacto" },
    ],
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [base, setBase] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [convivientes, setConvivientes] = useState<Conviviente[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [motivo, setMotivo] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function cargarBase() {
    setLoading(true);
    setError(null);
    setOkMsg(null);

    try {
      const res = await http.get("/formularios/mis-anexos?codigo=ANEXO_01&limit=50");
      const anexos = Array.isArray(res.data?.anexos) ? res.data.anexos : [];

      const aprobados = anexos
        .filter(isAprobado)
        .sort((a: any, b: any) => {
          const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
          const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
          return tb - ta;
        });

      const ultimo = aprobados[0] || anexos[0] || null;
      setBase(ultimo);

      const datos = ultimo?.datos && typeof ultimo.datos === "object" ? ultimo.datos : {};

      const next: Record<string, any> = {};
      campos.forEach((c) => (next[c.key] = datos[c.key] ?? ""));
      setForm(next);

      const conv = safeArray<Conviviente>(datos?.convivientes).map((c) => ({
        parentesco: c?.parentesco ?? "",
        apellido: c?.apellido ?? "",
        nombre: c?.nombre ?? "",
        dni: c?.dni ?? "",
        edad: c?.edad ?? "",
        observaciones: c?.observaciones ?? "",
      }));
      setConvivientes(conv);

      const mas = safeArray<Mascota>(datos?.mascotas).map((m) => ({
        tipo: m?.tipo ?? "",
        nombre: m?.nombre ?? "",
        observaciones: m?.observaciones ?? "",
      }));
      setMascotas(mas);
    } catch (e: any) {
      setError(e?.response?.data?.message || "No se pudo cargar el registro base.");
      setBase(null);
      setForm({});
      setConvivientes([]);
      setMascotas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChangeField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateConviviente(idx: number, patch: Partial<Conviviente>) {
    setConvivientes((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function addConviviente() {
    setConvivientes((prev) => [
      ...prev,
      { parentesco: "", apellido: "", nombre: "", dni: "", edad: "", observaciones: "" },
    ]);
  }

  function removeConviviente(idx: number) {
    setConvivientes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMascota(idx: number, patch: Partial<Mascota>) {
    setMascotas((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function addMascota() {
    setMascotas((prev) => [...prev, { tipo: "", nombre: "", observaciones: "" }]);
  }

  function removeMascota(idx: number) {
    setMascotas((prev) => prev.filter((_, i) => i !== idx));
  }

  function normalizeConvivientes(list: Conviviente[]) {
    return list
      .map((c) => ({
        parentesco: (c.parentesco || "").trim(),
        apellido: (c.apellido || "").trim(),
        nombre: (c.nombre || "").trim(),
        dni: (c.dni || "").trim(),
        edad: (c.edad || "").trim(),
        observaciones: (c.observaciones || "").trim(),
      }))
      .filter((c) =>
        [c.parentesco, c.apellido, c.nombre, c.dni, c.edad, c.observaciones].some((x) => x !== "")
      );
  }

  function normalizeMascotas(list: Mascota[]) {
    return list
      .map((m) => ({
        tipo: (m.tipo || "").trim(),
        nombre: (m.nombre || "").trim(),
        observaciones: (m.observaciones || "").trim(),
      }))
      .filter((m) => [m.tipo, m.nombre, m.observaciones].some((x) => x !== ""));
  }

  async function guardar() {
    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const datos = {
        ...form,
        convivientes: normalizeConvivientes(convivientes),
        mascotas: normalizeMascotas(mascotas),
      };

      await http.post("/formularios/mis-datos-declarados/actualizar", {
        datos,
        motivo: motivo?.trim() || null,
        baseAnexoId: base?._id || null,
      });

      setOkMsg("Actualización registrada correctamente.");
      setMotivo("");
    } catch (e: any) {
      setError(e?.response?.data?.message || "No se pudo registrar la actualización.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Actualizar mis datos</h2>
            <div style={styles.subtitle}>
              Toda modificación queda registrada con fecha y hora y genera alerta institucional.
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button
              onClick={() => navigate("/app/permisionario/mis-datos")}
              style={styles.secondaryButton}
            >
              Volver
            </button>
            <button
              onClick={() => navigate("/app/permisionario/mis-datos/historial")}
              style={styles.secondaryButton}
            >
              Historial
            </button>
          </div>
        </div>
      </div>

      <div style={styles.shell}>
        {loading ? <div style={styles.emptyState}>Cargando…</div> : null}

        {error ? (
          <div style={styles.alertError}>
            <b>Error:</b> {error}
          </div>
        ) : null}

        {okMsg ? <div style={styles.alertOk}>{okMsg}</div> : null}

        {!loading && !base ? (
          <div style={styles.emptyState}>
            No se encontró un registro aprobado para tomar como base.
          </div>
        ) : null}

        {!loading && base ? (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Registro base y edición</h3>

            <div style={styles.cardSubtle}>
              Base:{" "}
              <b>
                {base?.createdAt ? new Date(base.createdAt).toLocaleString("es-AR") : "—"}
              </b>
            </div>

            <div style={styles.formGrid}>
              {campos.map((c) => (
                <div key={c.key} style={styles.fieldRow}>
                  <label style={styles.label}>{c.label}</label>
                  <input
                    value={form[c.key] ?? ""}
                    onChange={(e) => onChangeField(c.key, e.target.value)}
                    style={styles.input}
                  />
                </div>
              ))}
            </div>

            <hr style={styles.sectionDivider} />

            <div>
              <div style={styles.sectionHeaderRow}>
                <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>
                  Grupo conviviente / familiar
                </h3>
                <button type="button" onClick={addConviviente} style={styles.secondaryButton}>
                  Agregar integrante
                </button>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Parentesco</th>
                      <th style={styles.th}>Apellido</th>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>DNI</th>
                      <th style={styles.th}>Edad</th>
                      <th style={styles.th}>Obs.</th>
                      <th style={styles.th} />
                    </tr>
                  </thead>
                  <tbody>
                    {convivientes.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={styles.emptyTableRow}>
                          (sin datos)
                        </td>
                      </tr>
                    ) : null}

                    {convivientes.map((c, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>
                          <select
                            value={c.parentesco || ""}
                            onChange={(e) => updateConviviente(idx, { parentesco: e.target.value })}
                            style={styles.input}
                          >
                            <option value="">—</option>
                            <option value="Cónyuge">Cónyuge</option>
                            <option value="Hijo/a">Hijo/a</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <input
                            value={c.apellido || ""}
                            onChange={(e) => updateConviviente(idx, { apellido: e.target.value })}
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            value={c.nombre || ""}
                            onChange={(e) => updateConviviente(idx, { nombre: e.target.value })}
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            value={c.dni || ""}
                            onChange={(e) => updateConviviente(idx, { dni: e.target.value })}
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            value={c.edad || ""}
                            onChange={(e) => updateConviviente(idx, { edad: e.target.value })}
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            value={c.observaciones || ""}
                            onChange={(e) =>
                              updateConviviente(idx, { observaciones: e.target.value })
                            }
                            style={styles.input}
                          />
                        </td>
                        <td style={{ ...styles.td, width: 96 }}>
                          <button
                            type="button"
                            onClick={() => removeConviviente(idx)}
                            style={styles.dangerButton}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.note}>
                Nota: aquí se registran cónyuge, hijos u otros convivientes. Se guarda solo lo que
                tenga datos cargados.
              </div>
            </div>

            <hr style={styles.sectionDivider} />

            <div>
              <div style={styles.sectionHeaderRow}>
                <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Mascotas</h3>
                <button type="button" onClick={addMascota} style={styles.secondaryButton}>
                  Agregar mascota
                </button>
              </div>

              <div style={styles.tableWrap}>
                <table style={{ ...styles.table, minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>Observaciones</th>
                      <th style={styles.th} />
                    </tr>
                  </thead>
                  <tbody>
                    {mascotas.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={styles.emptyTableRow}>
                          (sin datos)
                        </td>
                      </tr>
                    ) : null}

                    {mascotas.map((m, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>
                          <input
                            value={m.tipo || ""}
                            onChange={(e) => updateMascota(idx, { tipo: e.target.value })}
                            style={styles.input}
                            placeholder="Perro / Gato / etc."
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            value={m.nombre || ""}
                            onChange={(e) => updateMascota(idx, { nombre: e.target.value })}
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            value={m.observaciones || ""}
                            onChange={(e) => updateMascota(idx, { observaciones: e.target.value })}
                            style={styles.input}
                          />
                        </td>
                        <td style={{ ...styles.td, width: 96 }}>
                          <button
                            type="button"
                            onClick={() => removeMascota(idx)}
                            style={styles.dangerButton}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <hr style={styles.sectionDivider} />

            <div style={styles.fieldRowTop}>
              <label style={styles.label}>Motivo (opcional)</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                style={styles.textarea}
              />
            </div>

            <div style={{ ...styles.buttonRow, marginTop: 14 }}>
              <button onClick={guardar} disabled={saving} style={styles.primaryButton}>
                {saving ? "Guardando…" : "Registrar actualización"}
              </button>
              <button onClick={cargarBase} disabled={saving} style={styles.secondaryButton}>
                Recargar base
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
