//frontend/src/pages/permisionario/VerAnexoPermisionario.tsx
import AnexoViewer from "../../components/anexos/AnexoViewer";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import Anexo11ResumenRegistro from "../../components/anexos/Anexo11ResumenRegistro";
import Anexo04Vista from "../../components/anexos/Anexo04Vista";
import Anexo09Vista from "../../components/anexos/Anexo09Vista";

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

async function confirmarConformidadAnexo08() {
  if (!anexo?._id) return;
  if (up(anexo.codigo) !== "ANEXO_08") return;

  setBusy(true);
  setErrorMsg("");
  setInfoMsg("");

  try {
    await http.post(`/formularios/${anexo._id}/conformidad-permisionario-08`, {});
    setInfoMsg("Tu conformidad fue registrada correctamente.");
    await cargar();
  } catch (e: any) {
    console.error("[ANEXO_08] Error registrando conformidad permisionario", e);
    setErrorMsg(
      e?.response?.data?.message ||
        "No se pudo registrar tu conformidad. Intentalo más tarde o contactá al administrador."
    );
  } finally {
    setBusy(false);
  }
}

async function confirmarConformidadAnexo09() {
  if (!anexo?._id) return;
  if (up(anexo.codigo) !== "ANEXO_09") return;

  setBusy(true);
  setErrorMsg("");
  setInfoMsg("");

  try {
    await http.post(`/formularios/${anexo._id}/conformidad-permisionario-09`, {});
    setInfoMsg("Tu conformidad fue registrada correctamente.");
    await cargar();
  } catch (e: any) {
    console.error("[ANEXO_09] Error registrando conformidad permisionario", e);
    setErrorMsg(
      e?.response?.data?.message ||
        "No se pudo registrar tu conformidad. Intentalo más tarde o contactá al administrador."
    );
  } finally {
    setBusy(false);
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

async function descargarPdfAnexo() {
  if (!anexo?._id) return;

  try {
    const res = await http.get(`/formularios/${anexo._id}/pdf`, {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${anexo.codigo}_${anexo._id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    console.error("[PDF] Error descargando PDF", e);
    setErrorMsg(
      e?.response?.data?.message ||
        "No se pudo descargar el PDF. Intentalo más tarde."
    );
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

// AQUI VISUALIZAMOS EL ANEXO 08
if (codigo === "ANEXO_08") {
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

  const rep1 = d.representante1 || {};
  const rep2 = d.representante2 || {};

  return (
    <div style={{ padding: 24 }}>
      <button
        onClick={() => navigate("/app/permisionario/anexos")}
        style={{ marginBottom: 16 }}
        disabled={busy}
      >
        Volver
      </button>

      <h2>ANEXO 08 — Acta de inspección previa</h2>

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
          <b>Dirección:</b> {safe(d.direccion || d.direccionUnidad)}
        </p>
        <p>
          <b>Localidad:</b> {safe(d.localidad)}
        </p>
        <p>
          <b>Provincia:</b> {safe(d.provincia)}
        </p>
        <p>
          <b>Inspector:</b> {inspectorNombre}
        </p>
        <p>
          <b>Grado del permisionario:</b> {safe(d.gradoPermisionario)}
        </p>
        <p>
          <b>Lugar de inspección:</b> {safe(d.lugarInspeccion)}
        </p>
        <p>
          <b>Fecha de inspección:</b> {safe(d.fechaInspeccion)}
        </p>
        <p>
          <b>Lugar de firma:</b> {safe(d.lugarFirma)}
        </p>
        <p>
          <b>Fecha de firma:</b> {safe(d.fechaFirma)}
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
        <h3 style={{ marginTop: 0 }}>Reparaciones a cargo de la Armada</h3>
        {Array.isArray(d.reparacionesArmada) && d.reparacionesArmada.length ? (
          <ul>
            {d.reparacionesArmada.map((item: string, i: number) => (
              <li key={`armada-${i}`}>{safe(item)}</li>
            ))}
          </ul>
        ) : (
          <p>—</p>
        )}
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
        <h3 style={{ marginTop: 0 }}>Reparaciones a cargo del permisionario</h3>
        {Array.isArray(d.reparacionesPermisionario) && d.reparacionesPermisionario.length ? (
          <ul>
            {d.reparacionesPermisionario.map((item: string, i: number) => (
              <li key={`perm-${i}`}>{safe(item)}</li>
            ))}
          </ul>
        ) : (
          <p>—</p>
        )}
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
        <h3 style={{ marginTop: 0 }}>Observaciones del inspector</h3>
        <p>{safe(d.observacionesInspector)}</p>
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
        <h3 style={{ marginTop: 0 }}>Representante 1</h3>
        <p><b>Apellido y nombres:</b> {safe(rep1.apellidoNombres)}</p>
        <p><b>Grado:</b> {safe(rep1.grado)}</p>
        <p><b>M.R.:</b> {safe(rep1.mr)}</p>
        <p><b>Destino:</b> {safe(rep1.destino)}</p>
        <p><b>Teléfono:</b> {safe(rep1.telefono)}</p>
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
        <h3 style={{ marginTop: 0 }}>Representante 2</h3>
        <p><b>Apellido y nombres:</b> {safe(rep2.apellidoNombres)}</p>
        <p><b>Grado:</b> {safe(rep2.grado)}</p>
        <p><b>M.R.:</b> {safe(rep2.mr)}</p>
        <p><b>Destino:</b> {safe(rep2.destino)}</p>
        <p><b>Teléfono:</b> {safe(rep2.telefono)}</p>
      </section>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={cargar} disabled={busy}>
          Recargar
        </button>

        <button onClick={descargarPdfAnexo} disabled={busy}>
          Descargar PDF
        </button>

        <button onClick={confirmarConformidadAnexo08} disabled={busy || yaConforme}>
          {busy
            ? "Enviando…"
            : yaConforme
            ? "Conformidad registrada"
            : "Dar conformidad (ANEXO 08)"}
        </button>
      </div>
    </div>
  );
}

// aquí visualizamos ANEXO_09
if (codigo === "ANEXO_09") {
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

      <h2>ANEXO 09 — Acta de entrega de vivienda fiscal</h2>

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

      {/* Datos generales */}
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
          <b>Inspector:</b> {inspectorNombre}
        </p>
        <p>
          <b>Permisionario:</b> {permisionarioNombre}
        </p>
        <p>
          <b>Anexo origen:</b> {safe(d.derivadoDe)}
        </p>
      </section>

      {/* Vivienda */}
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
        <h3 style={{ marginTop: 0 }}>Identificación de la vivienda</h3>

        <p>
          <b>Unidad habitacional:</b> {viviendaLabel}
        </p>
        <p>
          <b>Dirección:</b> {safe(d.direccion || d.direccionUnidad)}
        </p>
        <p>
          <b>Localidad:</b> {safe(d.localidad)}
        </p>
        <p>
          <b>Provincia:</b> {safe(d.provincia)}
        </p>
        <p>
          <b>Barrio:</b> {safe(d.barrio)}
        </p>
      </section>

      {/* Acto de entrega */}
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
        <h3 style={{ marginTop: 0 }}>Acto de entrega</h3>

        <p>
          <b>Lugar de entrega:</b> {safe(d.lugarEntrega || d.lugarFirma)}
        </p>
        <p>
          <b>Fecha de entrega:</b> {safe(d.fechaEntrega || d.fechaFirma)}
        </p>
        <p>
          <b>Hora de entrega:</b> {safe(d.horaEntrega)}
        </p>
      </section>

      {/* Estado / Observaciones */}
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
        <h3 style={{ marginTop: 0 }}>Estado de la vivienda / Observaciones</h3>

        <p>
          <b>Observaciones:</b>{" "}
          {safe(d.observacionesEntrega || d.observacionesInspector || d.novedadesTexto)}
        </p>
        <p>
          <b>Inventario / Detalle:</b> {safe(d.detalleInventario)}
        </p>
        <p>
          <b>Servicios:</b> {safe(d.servicios)}
        </p>
        <p>
          <b>Llaves entregadas:</b> {safe(d.llavesEntregadas)}
        </p>
      </section>

      {/* Conformidad */}
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
        <h3 style={{ marginTop: 0 }}>Conformidad del permisionario</h3>

        <p>
          <b>Estado:</b> {yaConforme ? "Registrada" : "Pendiente"}
        </p>
        <p>
          <b>Fecha:</b> {safe(d?.conformidadPermisionario?.fecha)}
        </p>
        <p>
          <b>Observaciones:</b> {safe(d?.conformidadPermisionario?.observaciones)}
        </p>
      </section>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={cargar} disabled={busy}>
          Recargar
        </button>

<button onClick={confirmarConformidadAnexo09} disabled={busy || yaConforme}>
  {busy
    ? "Enviando…"
    : yaConforme
    ? "Conformidad registrada"
    : "Dar conformidad (ANEXO 09)"}
</button>

        <button onClick={descargarPdfAnexo} disabled={busy}>
          Descargar PDF
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
}  // ─────────────────────────────
  // ANEXO_11 — Vista completa para PERMISIONARIO
  // ─────────────────────────────
  if (codigo === "ANEXO_11") {
    const ambito = d.ambito || "VIVIENDA";
    const viviendaLabel =
      d.viviendaLabel || d.unidad || d.casa || d.viviendaCodigo || "—";
    const permisionarioNombre = d.permisionarioNombre || d.postulanteNombre || "—";
    const titulo = "ANEXO 11 – Formulario de Pedido de Trabajo";
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

        <div style={{ marginTop: 12 }}>
          <AnexoViewer codigo={anexo.codigo} datos={d} />
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={cargar} disabled={busy}>
            Recargar
          </button>
          <button onClick={confirmarConformidadAnexo11} disabled={busy || yaConforme}>
            {busy
              ? "Enviando…"
              : yaConforme
              ? "Conformidad registrada"
              : "Dar conformidad (ANEXO 11)"}
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