import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";

type FormState = {
  identidad: {
    apellido: string;
    nombres: string;
    genero: string;
    gradoEscalafon: string;
  };
  destino: {
    actual: string;
    futuro: string;
  };
};

function emptyForm(): FormState {
  return {
    identidad: { apellido: "", nombres: "", genero: "", gradoEscalafon: "" },
    destino: { actual: "", futuro: "" },
  };
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", color: "rgba(255,255,255,0.92)" } as React.CSSProperties,
  hero: {
    padding: 18,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
    marginBottom: 16,
  } as React.CSSProperties,
  title: { margin: 0, color: "#fff", fontSize: 28, fontWeight: 900 } as React.CSSProperties,
  subtitle: { marginTop: 8, color: "rgba(255,255,255,0.72)", lineHeight: 1.55 } as React.CSSProperties,
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 } as React.CSSProperties,
  card: {
    padding: 18,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
  } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 } as React.CSSProperties,
  label: { display: "grid", gap: 6, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 800 } as React.CSSProperties,
  input: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    minHeight: 90,
    resize: "vertical",
  } as React.CSSProperties,
  primary: {
    border: "1px solid rgba(59,130,246,0.9)",
    background: "linear-gradient(180deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  } as React.CSSProperties,
  secondary: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  } as React.CSSProperties,
  alert: { padding: 12, borderRadius: 12, marginBottom: 12 } as React.CSSProperties,
};

export default function ActualizarDatosDeclaradosAlojado() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const campos = useMemo(
    () => [
      ["identidad.apellido", "Apellido"],
      ["identidad.nombres", "Nombres"],
      ["identidad.genero", "Genero"],
      ["identidad.gradoEscalafon", "Grado / escalafon"],
      ["destino.actual", "Destino actual"],
      ["destino.futuro", "Destino futuro"],
    ],
    []
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        const res = await http.get("/alojamientos-mi/datos-declarados");
        const datos = res.data?.datos || {};
        if (!alive) return;
        setForm({
          identidad: {
            apellido: datos?.identidad?.apellido || "",
            nombres: datos?.identidad?.nombres || "",
            genero: datos?.identidad?.genero || "",
            gradoEscalafon: datos?.identidad?.gradoEscalafon || "",
          },
          destino: {
            actual: datos?.destino?.actual || "",
            futuro: datos?.destino?.futuro || "",
          },
        });
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.message || "No se pudo cargar el registro base.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  function setValue(path: string, value: string) {
    const [group, key] = path.split(".") as ["identidad" | "destino", string];
    setForm((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  async function guardar() {
    try {
      setSaving(true);
      setError("");
      setOk("");
      await http.post("/alojamientos-mi/datos-declarados/actualizar", {
        datos: form,
        motivo,
      });
      setMotivo("");
      setOk("Actualizacion registrada correctamente.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo registrar la actualizacion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Actualizar mis datos</h1>
        <p style={styles.subtitle}>
          Registro institucional de datos propios del alojado. No incluye datos sensibles,
          familiares, convivientes ni observaciones internas.
        </p>
        <div style={styles.row}>
          <button type="button" style={styles.secondary} onClick={() => navigate("/app/alojado/datos")}>
            Volver
          </button>
          <button type="button" style={styles.secondary} onClick={() => navigate("/app/alojado/datos/historial")}>
            Historial
          </button>
        </div>
      </section>

      {loading ? <div style={styles.card}>Cargando...</div> : null}
      {error ? <div style={{ ...styles.alert, border: "1px solid rgba(248,113,113,0.45)", color: "#fecaca" }}>{error}</div> : null}
      {ok ? <div style={{ ...styles.alert, border: "1px solid rgba(74,222,128,0.45)", color: "#bbf7d0" }}>{ok}</div> : null}

      {!loading ? (
        <section style={styles.card}>
          <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 18 }}>Registro base y edicion</h2>
          <div style={styles.grid}>
            {campos.map(([path, label]) => {
              const [group, key] = path.split(".") as ["identidad" | "destino", keyof FormState["identidad"]];
              const value = String((form[group] as any)?.[key] || "");
              return (
                <label key={path} style={styles.label}>
                  {label}
                  <input value={value} onChange={(e) => setValue(path, e.target.value)} style={styles.input} />
                </label>
              );
            })}
          </div>

          <label style={{ ...styles.label, marginTop: 14 }}>
            Motivo
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} style={styles.textarea} />
          </label>

          <div style={styles.row}>
            <button type="button" style={styles.primary} onClick={guardar} disabled={saving}>
              {saving ? "Guardando..." : "Registrar actualizacion"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
