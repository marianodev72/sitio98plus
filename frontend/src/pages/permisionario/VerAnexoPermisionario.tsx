//frontend/src/pages/permisionario/VerAnexoPermisionario.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import Anexo11ResumenRegistro from "../../components/anexos/Anexo11ResumenRegistro";
import Anexo04Vista from "../../components/anexos/Anexo04Vista";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  datos?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function VerAnexoPermisionario() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const res = await http.get(`/formularios/${id}`);
      const a = (res.data && res.data.anexo) || null;
      if (!a) {
        setErrorMsg("La página solicitada no está disponible.");
        setAnexo(null);
      } else {
        setAnexo(a);
      }
    } catch (e) {
      console.error("[VER ANEXO PERMISIONARIO]", e);
      setErrorMsg("La página solicitada no está disponible.");
      setAnexo(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmarConformidadAnexo11() {
    if (!anexo?._id) return;
    if (up(anexo.codigo) !== "ANEXO_11") return;

    setBusy(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      await http.post(`/formularios/${anexo._id}/conformidad-permisionario-11`, {});
      setInfoMsg("Tu conformidad fue registrada correctamente.");
      await cargar();
    } catch (e: any) {
      console.error("[ANEXO_11] Error registrando conformidad permisionario", e);
      setErrorMsg(
        e?.response?.data?.message ||
          "No se pudo registrar tu conformidad. Intentalo más tarde o contactá al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmarConformidadAnexo03() {
    if (!anexo?._id) return;
    if (up(anexo.codigo) !== "ANEXO_03") return;

    setBusy(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      await http.post(`/formularios/${anexo._id}/conformidad-permisionario-03`, {});
      setInfoMsg("Tu conformidad fue registrada correctamente.");
      await cargar();
    } catch (e: any) {
      console.error("[ANEXO_03] Error registrando conformidad permisionario", e);
      setErrorMsg(
        e?.response?.data?.message ||
          "No se pudo registrar tu conformidad. Intentalo más tarde o contactá al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  // Fail-closed UX. Backend valida igual.
  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <p>Cargando información…</p>
      </div>
    );
  }

  if (!anexo) {
    return (
      <div style={{ padding: 32 }}>
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
        <button onClick={() => navigate("/app/permisionario/anexos")}>Volver</button>
      </div>
    );
  }

  const d = anexo.datos || {};
  const codigo = up(anexo.codigo);

  const estado = safe(anexo.estado);
  const fechaInicio = fmtDate(anexo.createdAt);

  // ─────────────────────────────
  // ANEXO_04 — Vista clara para PERMISIONARIO (solo lectura)
  if (codigo === "ANEXO_04") {
    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/anexos")}
          style={{ marginBottom: 16 }}
          disabled={busy}
        >
          Volver
        </button>

        <h2>ANEXO 04 — Aviso de ausencia prolongada</h2>

        {errorMsg && (
          <div style={{ marginTop: 8, marginBottom: 8, padding: 10, border: "1px solid #f44336", background: "#ffebee" }}>
            {errorMsg}
          </div>
        )}

        {infoMsg && !errorMsg && (
          <div style={{ marginTop: 8, marginBottom: 8, padding: 10, border: "1px solid #4caf50", background: "#e8f5e9" }}>
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
          <p>
            <b>Estado:</b> {estado}
            {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
          </p>
          <p>
            <b>Fecha de inicio:</b> {fechaInicio}
          </p>
          <p>
            <b>Permisionario:</b> {safe(d.permisionarioNombre)}
          </p>
          <p>
            <b>Barrio:</b> {safe(d.barrioAsignado || d.barrio)}
          </p>
        </section>

        <Anexo04Vista datos={d} />

        <div style={{ marginTop: 12 }}>
          <button onClick={cargar} disabled={busy}>
            Recargar
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // ANEXO_03 — Vista clara para PERMISIONARIO
  if (codigo === "ANEXO_03") {
    const viviendaLabel =
      d.viviendaLabel ||
      d.viviendaCodigo ||
      d.unidadHabitacional ||
      d.casa ||
      "—";

    const permisionarioNombre =
      d.permisionarioNombre ||
      d.postulanteNombre ||
      d.apellidoNombres ||
      "—";

    const inspectorNombre = d.inspectorNombre || "—";
    const yaConforme = !!d?.conformidadPermisionario?.ok;

    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/anexos")}
          style={{ marginBottom: 16 }}
          disabled={busy}
        >
          Volver
        </button>

        <h2>ANEXO 03 — Acta de recepción de vivienda fiscal</h2>

        {errorMsg && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 8,
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
              marginTop: 8,
              marginBottom: 8,
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
          <p>
            <b>Estado:</b> {estado}
            {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
          </p>
          <p>
            <b>Fecha de inicio:</b> {fechaInicio}
          </p>
          <p>
            <b>Permisionario:</b> {permisionarioNombre}
          </p>
          <p>
            <b>Unidad habitacional:</b> {viviendaLabel}
          </p>
          <p>
            <b>Dirección / Barrio:</b> {safe(d.direccion)}
          </p>
          <p>
            <b>Localidad:</b> {safe(d.localidad)}
          </p>
          <p>
            <b>Provincia:</b> {safe(d.provincia)}
          </p>
          <p>
            <b>Inspector / Designado:</b> {inspectorNombre}
          </p>
          <p>
            <b>Lugar de firma:</b> {safe(d.lugarFirma)}
          </p>
          <p>
            <b>Fecha de firma:</b> {safe(d.fechaFirma)}
          </p>
          <p>
            <b>Novedades:</b> {safe(d.novedadesTexto)}
          </p>
          <p>
            <b>Conformidad del permisionario:</b> {yaConforme ? "Registrada" : "Pendiente"}
          </p>
        </section>

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
          <h3 style={{ marginTop: 0 }}>Material entregado</h3>
          <p><b>Llaves edificio:</b> {safe(d.material?.llavesEdificio)}</p>
          <p><b>Llaves vivienda:</b> {safe(d.material?.llavesVivienda)}</p>
          <p><b>Llaves baulera:</b> {safe(d.material?.llavesBaulera)}</p>
          <p><b>Llave terraza:</b> {safe(d.material?.llaveTerraza)}</p>
          <p><b>Llave cochera:</b> {safe(d.material?.llaveCochera)}</p>
          <p><b>Inventario muebles:</b> {safe(d.material?.inventarioMuebles)}</p>
          <p><b>Línea telefónica:</b> {safe(d.material?.lineaTelefonica)}</p>
        </section>

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
          <h3 style={{ marginTop: 0 }}>Documentación entregada</h3>
          <p><b>Reglamento de viviendas:</b> {safe(d.documentacion?.reglamentoViviendas)}</p>
          <p><b>Guía telefónica:</b> {safe(d.documentacion?.guiaTelefonica)}</p>
          <p><b>Reglamento de copropiedad:</b> {safe(d.documentacion?.reglamentoCopropiedad)}</p>
        </section>

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
          <h3 style={{ marginTop: 0 }}>Medidores</h3>
          <p><b>Gas (m³):</b> {safe(d.medidores?.gas_m3)}</p>
          <p><b>Agua (m³):</b> {safe(d.medidores?.agua_m3)}</p>
          <p><b>Luz (kws):</b> {safe(d.medidores?.luz_kws)}</p>
          <p><b>Teléfono (pulsos):</b> {safe(d.medidores?.telefono_pulsos)}</p>
        </section>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={cargar} disabled={busy}>
            Recargar
          </button>

          <button onClick={confirmarConformidadAnexo03} disabled={busy || yaConforme}>
            {busy ? "Enviando…" : yaConforme ? "Conformidad registrada" : "Dar conformidad (ANEXO 03)"}
          </button>
        </div>
      </div>
    );
  }

  // Si NO es ANEXO_11, esta pantalla NO lo debe renderizar como ANEXO_11
  if (codigo !== "ANEXO_11") {
    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/anexos")}
          style={{ marginBottom: 16 }}
          disabled={busy}
        >
          Volver
        </button>

        <h2>La página solicitada no está disponible.</h2>
        <p>
          Este anexo ({codigo}) no se visualiza en esta pantalla.
        </p>
      </div>
    );
  }

  // ─────────────────────────────
  // ANEXO_11 — Vista actual
  // ─────────────────────────────

  if (codigo === "ANEXO_11") {
    const ambito = d.ambito || "VIVIENDA";
    const viviendaLabel =
      d.viviendaLabel || d.unidad || d.casa || d.viviendaCodigo || "—";
    const permisionarioNombre = d.permisionarioNombre || d.postulanteNombre || "—";
    const titulo = "ANEXO 11 – Formulario de Pedido de Trabajo";

    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/anexos")}
          style={{ marginBottom: 16 }}
          disabled={busy}
        >
          Volver
        </button>

        <h2>{titulo}</h2>

        <Anexo11ResumenRegistro anexo={anexo as any} mostrarAdmin={true} />

        {errorMsg && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 8,
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
              marginTop: 8,
              marginBottom: 8,
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
          <p>
            <b>Estado:</b> {estado}
            {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
          </p>
          <p>
            <b>Fecha de inicio:</b> {fechaInicio}
          </p>
          <p>
            <b>Ámbito:</b> {ambito}
          </p>
          <p>
            <b>Vivienda / Espacio:</b> {viviendaLabel}
          </p>
          <p>
            <b>Permisionario:</b> {permisionarioNombre}
          </p>
        </section>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={cargar} disabled={busy}>
            Recargar
          </button>
          <button onClick={confirmarConformidadAnexo11} disabled={busy}>
            {busy ? "Enviando…" : "Dar conformidad (ANEXO 11)"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // Cualquier otro anexo NO se muestra acá (fail-closed)
  return (
    <div style={{ padding: 32 }}>
      <h2>La página solicitada no está disponible.</h2>
      <p>Por favor, contacte al administrador.</p>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => navigate("/app/permisionario/anexos")}>
          Volver
        </button>
      </div>
    </div>
  );
}
