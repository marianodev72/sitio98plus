// frontend/src/pages/permisionario/CrearAnexo04Permisionario.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

type Rep = {
  apellidoNombres: string;
  parentesco: string;
  domicilio: string;
  telefono: string;
  destino: string;
  telefonoDestino: string;
};

function safeDateParts(iso: string): { dia: string; mes: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return { dia, mes };
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
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#fff",
  } as React.CSSProperties,

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
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
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    outline: "none",
    fontSize: 14,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    outline: "none",
    fontSize: 14,
    resize: "vertical" as const,
    minHeight: 110,
  } as React.CSSProperties,

  note: {
    marginTop: 10,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.5,
  } as React.CSSProperties,

  alertError: {
    marginBottom: 12,
    padding: 12,
    border: "1px solid rgba(244,67,54,0.6)",
    background: "rgba(244,67,54,0.12)",
    borderRadius: 12,
    color: "#ffe5e5",
  } as React.CSSProperties,

  alertOk: {
    marginBottom: 12,
    padding: 12,
    border: "1px solid rgba(76,175,80,0.55)",
    background: "rgba(76,175,80,0.12)",
    borderRadius: 12,
    color: "#e8ffe8",
  } as React.CSSProperties,

  buttonRow: {
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
};

function RepBlock({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Rep;
  onChange: (next: Rep) => void;
}) {
  return (
    <section style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>

      <div style={styles.formGrid}>
        <div style={styles.field}>
          <label style={styles.label}>Apellido y nombres</label>
          <input
            value={value.apellidoNombres}
            onChange={(e) => onChange({ ...value, apellidoNombres: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Parentesco</label>
          <input
            value={value.parentesco}
            onChange={(e) => onChange({ ...value, parentesco: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Domicilio</label>
          <input
            value={value.domicilio}
            onChange={(e) => onChange({ ...value, domicilio: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Teléfono</label>
          <input
            value={value.telefono}
            onChange={(e) => onChange({ ...value, telefono: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Destino</label>
          <input
            value={value.destino}
            onChange={(e) => onChange({ ...value, destino: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Teléfono destino</label>
          <input
            value={value.telefonoDestino}
            onChange={(e) => onChange({ ...value, telefonoDestino: e.target.value })}
            style={styles.input}
          />
        </div>
      </div>
    </section>
  );
}

export default function CrearAnexo04Permisionario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={styles.denied}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const [desdeISO, setDesdeISO] = useState("");
  const [hastaISO, setHastaISO] = useState("");
  const [motivo, setMotivo] = useState("");

  const [repEmergencia, setRepEmergencia] = useState<Rep>({
    apellidoNombres: "",
    parentesco: "",
    domicilio: "",
    telefono: "",
    destino: "",
    telefonoDestino: "",
  });

  const [repOrganismo, setRepOrganismo] = useState<Rep>({
    apellidoNombres: "",
    parentesco: "",
    domicilio: "",
    telefono: "",
    destino: "",
    telefonoDestino: "",
  });

  const [lugarYFecha, setLugarYFecha] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const desdeParts = useMemo(() => safeDateParts(desdeISO), [desdeISO]);
  const hastaParts = useMemo(() => safeDateParts(hastaISO), [hastaISO]);

  function validate(): string | null {
    if (!desdeParts || !hastaParts) return "Debe completar el período de ausencia (desde/hasta).";
    if (!motivo.trim()) return "Debe indicar el motivo de la ausencia prolongada.";
    if (!repEmergencia.apellidoNombres.trim()) {
      return "Debe completar Apellido y nombres (Emergencia).";
    }
    if (!repEmergencia.telefono.trim()) return "Debe completar Teléfono (Emergencia).";
    if (!repOrganismo.apellidoNombres.trim()) {
      return "Debe completar Apellido y nombres (Relación con O. Administrador).";
    }
    if (!repOrganismo.telefono.trim()) {
      return "Debe completar Teléfono (Relación con O. Administrador).";
    }
    return null;
  }

  async function crear() {
    const v = validate();
    if (v) {
      setErrorMsg(v);
      setInfoMsg("");
      return;
    }

    setBusy(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const datos = {
        periodoDesdeISO: desdeISO,
        periodoHastaISO: hastaISO,
        periodoDesde: desdeParts,
        periodoHasta: hastaParts,
        motivo: motivo.trim(),
        representanteEmergencia: { ...repEmergencia },
        representanteOrganismo: { ...repOrganismo },
        lugarYFecha: lugarYFecha.trim(),
      };

      const res = await http.post("/formularios/ANEXO_04", { datos });
      const anexo = res.data?.anexo || null;

      if (anexo?._id) {
        setInfoMsg("ANEXO 04 creado correctamente.");
        navigate(`/app/permisionario/anexos/${anexo._id}`);
      } else {
        setErrorMsg("No se pudo crear el ANEXO 04. Por favor, contacte al administrador.");
      }
    } catch (e: any) {
      console.error("[ANEXO_04] Error creando", e);
      setErrorMsg(
        e?.response?.data?.message ||
          "No se pudo procesar su solicitud. Por favor, contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h2 style={styles.title}>Crear ANEXO 04 — Aviso de ausencia prolongada</h2>
        <div style={styles.subtitle}>
          Completá el período de ausencia, el motivo y los datos de contacto requeridos para el
          circuito institucional.
        </div>
      </div>

      {errorMsg ? <div style={styles.alertError}>{errorMsg}</div> : null}
      {infoMsg && !errorMsg ? <div style={styles.alertOk}>{infoMsg}</div> : null}

      <div style={styles.shell}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Período de ausencia</h3>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Desde</label>
              <input
                type="date"
                value={desdeISO}
                onChange={(e) => setDesdeISO(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Hasta</label>
              <input
                type="date"
                value={hastaISO}
                onChange={(e) => setHastaISO(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Motivo</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                style={styles.textarea}
              />
            </div>
          </div>
        </section>

        <RepBlock
          title="En caso de emergencia comunicarse con:"
          value={repEmergencia}
          onChange={setRepEmergencia}
        />

        <RepBlock
          title="En relación con el Organismo Administrador, comunicarse con:"
          value={repOrganismo}
          onChange={setRepOrganismo}
        />

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Lugar y fecha</h3>

          <div style={styles.field}>
            <label style={styles.label}>Lugar y fecha</label>
            <input
              value={lugarYFecha}
              onChange={(e) => setLugarYFecha(e.target.value)}
              style={styles.input}
            />
          </div>

          <p style={styles.note}>
            Nota: los datos del Permisionario (apellido y nombres, grado, M.R., domicilio,
            teléfono) se autocompletan en backend (seguridad institucional).
          </p>
        </section>

        <div style={styles.buttonRow}>
          <button onClick={() => navigate(-1)} disabled={busy} style={styles.secondaryButton}>
            Volver
          </button>
          <button onClick={crear} disabled={busy} style={styles.primaryButton}>
            {busy ? "Creando..." : "Crear ANEXO 04"}
          </button>
        </div>
      </div>
    </div>
  );
}