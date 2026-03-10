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
    <section
      style={{
        marginTop: 12,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fff",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          Apellido y nombres
          <input
            value={value.apellidoNombres}
            onChange={(e) => onChange({ ...value, apellidoNombres: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Parentesco
          <input
            value={value.parentesco}
            onChange={(e) => onChange({ ...value, parentesco: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Domicilio
          <input
            value={value.domicilio}
            onChange={(e) => onChange({ ...value, domicilio: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Teléfono
          <input
            value={value.telefono}
            onChange={(e) => onChange({ ...value, telefono: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Destino
          <input
            value={value.destino}
            onChange={(e) => onChange({ ...value, destino: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Teléfono destino
          <input
            value={value.telefonoDestino}
            onChange={(e) => onChange({ ...value, telefonoDestino: e.target.value })}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
      </div>
    </section>
  );
}

export default function CrearAnexo04Permisionario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Seguridad UX mínima: backend valida igual (no disclosure)
  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  // Usamos input type="date" para evitar errores y mejorar UX (almanaque)
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

    if (!repEmergencia.apellidoNombres.trim()) return "Debe completar Apellido y nombres (Emergencia).";
    if (!repEmergencia.telefono.trim()) return "Debe completar Teléfono (Emergencia).";

    if (!repOrganismo.apellidoNombres.trim()) return "Debe completar Apellido y nombres (Relación con O. Administrador).";
    if (!repOrganismo.telefono.trim()) return "Debe completar Teléfono (Relación con O. Administrador).";

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
        // Guardamos el ISO completo (útil para auditoría) + partes día/mes (formato del PDF)
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
        // Ruta existente de detalle
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
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h2>Crear ANEXO 04 — Aviso de ausencia prolongada</h2>

      {errorMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #f44336",
            background: "#ffebee",
          }}
        >
          {errorMsg}
        </div>
      )}

      {infoMsg && !errorMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #4caf50",
            background: "#e8f5e9",
          }}
        >
          {infoMsg}
        </div>
      )}

      <section
        style={{
          marginTop: 12,
          marginBottom: 12,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Período de ausencia</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Desde
            <input
              type="date"
              value={desdeISO}
              onChange={(e) => setDesdeISO(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <label>
            Hasta
            <input
              type="date"
              value={hastaISO}
              onChange={(e) => setHastaISO(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: 12 }}>
          Motivo
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
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

      <section
        style={{
          marginTop: 12,
          marginBottom: 12,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fff",
        }}
      >
        <label style={{ display: "block" }}>
          Lugar y fecha
          <input
            value={lugarYFecha}
            onChange={(e) => setLugarYFecha(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
          Nota: los datos del Permisionario (apellido y nombres, grado, M.R., domicilio, teléfono)
          se autocompletan en backend (seguridad institucional).
        </p>
      </section>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => navigate(-1)} disabled={busy}>
          Volver
        </button>
        <button onClick={crear} disabled={busy}>
          {busy ? "Creando..." : "Crear ANEXO 04"}
        </button>
      </div>
    </div>
  );
}
