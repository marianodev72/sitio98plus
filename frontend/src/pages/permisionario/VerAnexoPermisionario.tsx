// frontend/src/pages/permisionario/VerAnexoPermisionario.tsx
import AnexoViewer from "../../components/anexos/AnexoViewer";
import Anexo03InspectorForm from "../../components/anexos/Anexo03InspectorForm";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import Anexo11ResumenRegistro from "../../components/anexos/Anexo11ResumenRegistro";
import Anexo04Vista from "../../components/anexos/Anexo04Vista";
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  infoGridStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "./uiStyles";

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
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => navigate("/app/permisionario/anexos")}
                style={secondaryButtonStyle}
                disabled={busy}
              >
                Volver
              </button>
            </div>

            <h2 style={titleStyle}>ANEXO 04 — Aviso de ausencia prolongada</h2>

            <p style={{ ...subtitleStyle, maxWidth: 860 }}>
              Vista de solo lectura del trámite generado por el permisionario dentro del circuito
              institucional.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(244,67,54,0.6)",
                background: "rgba(244,67,54,0.12)",
                color: "#ffe5e5",
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(76,175,80,0.55)",
                background: "rgba(76,175,80,0.12)",
                color: "#e8ffe8",
              }}
            >
              {infoMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Resumen del trámite</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Estado
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {estado}
                    {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Fecha de inicio
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {fechaInicio}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Permisionario
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.permisionarioNombre)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Barrio
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.barrioAsignado || d.barrio)}
                  </div>
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Detalle del anexo</h3>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <Anexo04Vista datos={d} />
              </div>
            </section>

            <div style={buttonRowStyle}>
              <button onClick={cargar} disabled={busy} style={primaryButtonStyle}>
                Recargar
              </button>
            </div>
          </div>
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
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => navigate("/app/permisionario/anexos")}
                style={secondaryButtonStyle}
                disabled={busy}
              >
                Volver
              </button>
            </div>

            <h2 style={titleStyle}>ANEXO 03 — Acta de recepción de vivienda fiscal</h2>

            <p style={{ ...subtitleStyle, maxWidth: 860 }}>
              Vista de lectura y conformidad del acta de recepción asociada a la vivienda fiscal.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(244,67,54,0.6)",
                background: "rgba(244,67,54,0.12)",
                color: "#ffe5e5",
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(76,175,80,0.55)",
                background: "rgba(76,175,80,0.12)",
                color: "#e8ffe8",
              }}
            >
              {infoMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Resumen del trámite</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Estado
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {estado}
                    {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Fecha de inicio
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {fechaInicio}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Permisionario
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {permisionarioNombre}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Unidad habitacional
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {viviendaLabel}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Dirección / Barrio
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.direccion)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Localidad
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.localidad)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Provincia
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.provincia)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Inspector / Designado
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {inspectorNombre}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Lugar de firma
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.lugarFirma)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Fecha de firma
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.fechaFirma)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Novedades
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {safe(d.novedadesTexto)}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Conformidad del permisionario
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {yaConforme ? "Registrada" : "Pendiente"}
                  </div>
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Material entregado</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Llaves edificio</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.llavesEdificio)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Llaves vivienda</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.llavesVivienda)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Llaves baulera</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.llavesBaulera)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Llave terraza</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.llaveTerraza)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Llave cochera</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.llaveCochera)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Inventario muebles</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.inventarioMuebles)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Línea telefónica</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.material?.lineaTelefonica)}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Documentación entregada</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Reglamento de viviendas</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.documentacion?.reglamentoViviendas)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Guía telefónica</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.documentacion?.guiaTelefonica)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Reglamento de copropiedad</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.documentacion?.reglamentoCopropiedad)}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Medidores</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Gas (m³)</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.medidores?.gas_m3)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Agua (m³)</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.medidores?.agua_m3)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Luz (kws)</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.medidores?.luz_kws)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Teléfono (pulsos)</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.medidores?.telefono_pulsos)}</div></div>
              </div>
            </section>

            <div style={buttonRowStyle}>
              <button onClick={cargar} disabled={busy} style={primaryButtonStyle}>
                Recargar
              </button>

              <button
                onClick={confirmarConformidadAnexo03}
                disabled={busy || yaConforme}
                style={successButtonStyle}
              >
                {busy
                  ? "Enviando…"
                  : yaConforme
                  ? "Conformidad registrada"
                  : "Dar conformidad (ANEXO 03)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

// ─────────────────────────────
  // ANEXO_07
// ─────────────────────────────
// ANEXO_07 — Vista clara para PERMISIONARIO
if (codigo === "ANEXO_07") {
  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => navigate("/app/permisionario/anexos")}
              style={secondaryButtonStyle}
              disabled={busy}
            >
              Volver
            </button>
          </div>

          <h2 style={titleStyle}>
            ANEXO 07 — Ampliación de novedades
          </h2>

          <p style={{ ...subtitleStyle, maxWidth: 860 }}>
            Vista de lectura del acta de ampliación de novedades de la vivienda fiscal.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(244,67,54,0.6)",
              background: "rgba(244,67,54,0.12)",
              color: "#ffe5e5",
            }}
          >
            {errorMsg}
          </div>
        )}

        {infoMsg && !errorMsg && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(76,175,80,0.55)",
              background: "rgba(76,175,80,0.12)",
              color: "#e8ffe8",
            }}
          >
            {infoMsg}
          </div>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          <section style={cardStyle}>
            <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
              Detalle del anexo
            </h3>

            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <AnexoViewer codigo="ANEXO_07" datos={d} />
            </div>
          </section>

          <div style={buttonRowStyle}>
            <button
              onClick={cargar}
              disabled={busy}
              style={primaryButtonStyle}
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

  // ─────────────────────────────
  // ANEXO_08
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

    const listStyle = {
      margin: 0,
      paddingLeft: 18,
      color: "#ffffff",
      lineHeight: 1.7,
    };

    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => navigate("/app/permisionario/anexos")}
                style={secondaryButtonStyle}
                disabled={busy}
              >
                Volver
              </button>
            </div>

            <h2 style={titleStyle}>ANEXO 08 — Acta de inspección previa</h2>

            <p style={{ ...subtitleStyle, maxWidth: 860 }}>
              Vista de lectura y conformidad previa sobre el estado de la vivienda y las reparaciones
              registradas en el acta institucional.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(244,67,54,0.6)",
                background: "rgba(244,67,54,0.12)",
                color: "#ffe5e5",
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(76,175,80,0.55)",
                background: "rgba(76,175,80,0.12)",
                color: "#e8ffe8",
              }}
            >
              {infoMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Resumen del trámite</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Estado</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{estado}{anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Fecha de inicio</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{fechaInicio}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Permisionario</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{permisionarioNombre}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Unidad habitacional</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{viviendaLabel}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Dirección</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.direccion || d.direccionUnidad)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Localidad</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.localidad)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Provincia</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.provincia)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Inspector</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{inspectorNombre}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Grado del permisionario</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.gradoPermisionario)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Lugar de inspección</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.lugarInspeccion)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Fecha de inspección</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.fechaInspeccion)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Lugar de firma</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.lugarFirma)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Fecha de firma</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.fechaFirma)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Conformidad del permisionario</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{yaConforme ? "Registrada" : "Pendiente"}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
                Reparaciones a cargo de la Armada
              </h3>

              <div style={softCardStyle}>
                {Array.isArray(d.reparacionesArmada) && d.reparacionesArmada.length ? (
                  <ul style={listStyle}>
                    {d.reparacionesArmada.map((item: string, i: number) => (
                      <li key={`armada-${i}`}>{safe(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: "#ffffff" }}>—</div>
                )}
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
                Reparaciones a cargo del permisionario
              </h3>

              <div style={softCardStyle}>
                {Array.isArray(d.reparacionesPermisionario) && d.reparacionesPermisionario.length ? (
                  <ul style={listStyle}>
                    {d.reparacionesPermisionario.map((item: string, i: number) => (
                      <li key={`perm-${i}`}>{safe(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: "#ffffff" }}>—</div>
                )}
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Observaciones del inspector</h3>

              <div style={softCardStyle}>
                <div style={{ fontSize: 16, lineHeight: 1.7, color: "#ffffff" }}>
                  {safe(d.observacionesInspector)}
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Representante 1</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Apellido y nombres</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep1.apellidoNombres)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Grado</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep1.grado)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>M.R.</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep1.mr)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Destino</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep1.destino)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Teléfono</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep1.telefono)}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Representante 2</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Apellido y nombres</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep2.apellidoNombres)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Grado</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep2.grado)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>M.R.</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep2.mr)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Destino</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep2.destino)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Teléfono</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(rep2.telefono)}</div></div>
              </div>
            </section>

            <div style={buttonRowStyle}>
              <button onClick={cargar} disabled={busy} style={primaryButtonStyle}>
                Recargar
              </button>

              <button
                onClick={descargarPdfAnexo}
                disabled={busy}
                style={secondaryButtonStyle}
              >
                Descargar PDF
              </button>

              <button
                onClick={confirmarConformidadAnexo08}
                disabled={busy || yaConforme}
                style={successButtonStyle}
              >
                {busy
                  ? "Enviando…"
                  : yaConforme
                  ? "Conformidad registrada"
                  : "Dar conformidad (ANEXO 08)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // ANEXO_09
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
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => navigate("/app/permisionario/anexos")}
                style={secondaryButtonStyle}
                disabled={busy}
              >
                Volver
              </button>
            </div>

            <h2 style={titleStyle}>ANEXO 09 — Acta de entrega de vivienda fiscal</h2>

            <p style={{ ...subtitleStyle, maxWidth: 860 }}>
              Vista de entrega formal de la vivienda, incluyendo estado, inventario y conformidad del
              permisionario.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(244,67,54,0.6)",
                background: "rgba(244,67,54,0.12)",
                color: "#ffe5e5",
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(76,175,80,0.55)",
                background: "rgba(76,175,80,0.12)",
                color: "#e8ffe8",
              }}
            >
              {infoMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Datos generales</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Estado</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{estado}{anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Fecha de inicio</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{fechaInicio}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Inspector</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{inspectorNombre}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Permisionario</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{permisionarioNombre}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Anexo origen</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.derivadoDe)}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
                Formulario de entrega completo
              </h3>
              <Anexo03InspectorForm
                value={d}
                onChange={() => undefined}
                readOnly
                anexoCodigo="09"
                tipoActa="ENTREGA"
                validarAntesDeEnviar={false}
              />
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
                Identificación de la vivienda
              </h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Unidad habitacional</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{viviendaLabel}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Dirección</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.direccion || d.direccionUnidad)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Localidad</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.localidad)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Provincia</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.provincia)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Barrio</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.barrio)}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Acto de entrega</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Lugar</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.lugarEntrega || d.lugarFirma || d.lugar)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Fecha</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.fechaEntrega || d.fechaFirma)}</div></div>
                <div style={softCardStyle}><div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>Hora</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>{safe(d.horaEntrega || d.horaFirma)}</div></div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
                Estado / Observaciones
              </h3>

              <div style={softCardStyle}>
                <p><b>Observaciones:</b> {safe(d.observacionesEntrega || d.observacionesInspector || d.novedadesTexto)}</p>
                <p><b>Inventario:</b> {safe(d.detalleInventario)}</p>
                <p><b>Servicios:</b> {safe(d.servicios)}</p>
                <p><b>Llaves:</b> {safe(d.llavesEntregadas)}</p>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>
                Conformidad del permisionario
              </h3>

              <div style={softCardStyle}>
                <p><b>Estado:</b> {yaConforme ? "Registrada" : "Pendiente"}</p>
                <p><b>Fecha:</b> {safe(d?.conformidadPermisionario?.fecha)}</p>
                <p><b>Observaciones:</b> {safe(d?.conformidadPermisionario?.observaciones)}</p>
              </div>
            </section>

            <div style={buttonRowStyle}>
              <button onClick={cargar} disabled={busy} style={primaryButtonStyle}>
                Recargar
              </button>

              <button
                onClick={confirmarConformidadAnexo09}
                disabled={busy || yaConforme}
                style={successButtonStyle}
              >
                {busy
                  ? "Enviando…"
                  : yaConforme
                  ? "Conformidad registrada"
                  : "Dar conformidad (ANEXO 09)"}
              </button>

              <button
                onClick={descargarPdfAnexo}
                disabled={busy}
                style={secondaryButtonStyle}
              >
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si NO es ANEXO_11, esta pantalla NO lo debe renderizar como ANEXO_11
  if (codigo !== "ANEXO_11") {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => navigate("/app/permisionario/anexos")}
                style={secondaryButtonStyle}
                disabled={busy}
              >
                Volver
              </button>
            </div>

            <h2 style={titleStyle}>La página solicitada no está disponible.</h2>

            <p style={{ ...subtitleStyle, maxWidth: 760 }}>
              Este anexo ({codigo}) no se visualiza en esta pantalla.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // ANEXO_11 — Vista completa para PERMISIONARIO
  if (codigo === "ANEXO_11") {
    const ambito = d.ambito || "VIVIENDA";
    const viviendaLabel =
      d.viviendaLabel || d.unidad || d.casa || d.viviendaCodigo || "—";
    const permisionarioNombre = d.permisionarioNombre || d.postulanteNombre || "—";
    const titulo = "ANEXO 11 – Formulario de Pedido de Trabajo";
    const yaConforme = !!d?.conformidadPermisionario?.ok;

    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => navigate("/app/permisionario/anexos")}
                style={secondaryButtonStyle}
                disabled={busy}
              >
                Volver
              </button>
            </div>

            <h2 style={titleStyle}>{titulo}</h2>

            <p style={{ ...subtitleStyle, maxWidth: 860 }}>
              Vista completa del pedido de trabajo, con resumen institucional, datos del ámbito y
              estado de conformidad del permisionario.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(244,67,54,0.6)",
                background: "rgba(244,67,54,0.12)",
                color: "#ffe5e5",
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(76,175,80,0.55)",
                background: "rgba(76,175,80,0.12)",
                color: "#e8ffe8",
              }}
            >
              {infoMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Resumen del trámite</h3>

              <div style={infoGridStyle}>
                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Estado
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {estado}
                    {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Fecha de inicio
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {fechaInicio}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Ámbito
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {ambito}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Vivienda / Espacio
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {viviendaLabel}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Permisionario
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {permisionarioNombre}
                  </div>
                </div>

                <div style={softCardStyle}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginBottom: 6 }}>
                    Conformidad del permisionario
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                    {yaConforme ? "Registrada" : "Pendiente"}
                  </div>
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Resumen institucional</h3>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <Anexo11ResumenRegistro anexo={anexo as any} mostrarAdmin={true} />
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ ...sectionTitleStyle, marginTop: 0 }}>Detalle del anexo</h3>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <AnexoViewer codigo={anexo.codigo} datos={d} />
              </div>
            </section>

            <div style={buttonRowStyle}>
              <button onClick={cargar} disabled={busy} style={primaryButtonStyle}>
                Recargar
              </button>

              <button
                onClick={confirmarConformidadAnexo11}
                disabled={busy || yaConforme}
                style={successButtonStyle}
              >
                {busy
                  ? "Enviando…"
                  : yaConforme
                  ? "Conformidad registrada"
                  : "Dar conformidad (ANEXO 11)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // Cualquier otro anexo NO se muestra acá (fail-closed)
  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>La página solicitada no está disponible.</h2>

          <p style={{ ...subtitleStyle, maxWidth: 760 }}>
            Este anexo no puede visualizarse desde esta pantalla. Por favor, contacte al administrador.
          </p>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => navigate("/app/permisionario/anexos")}
              style={secondaryButtonStyle}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
