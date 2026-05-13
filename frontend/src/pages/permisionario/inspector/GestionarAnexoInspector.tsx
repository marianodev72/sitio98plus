// frontend/src/pages/permisionario/inspector/GestionarAnexoInspector.tsx

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";
import Anexo04Vista from "../../../components/anexos/Anexo04Vista";
import AnexoViewer from "../../../components/anexos/AnexoViewer";
import Anexo03InspectorForm, {
  type Anexo03Datos,
} from "../../../components/anexos/Anexo03InspectorForm";
import GestionarAnexo11Inspector from "./GestionarAnexo11Inspector";
import Anexo08InspectorForm, {
  type Anexo08Datos,
} from "../../../components/anexos/Anexo08InspectorForm";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
  derivadoDe?: string;
  historialEstados?: any[];
  usuario?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function GestionarAnexoInspector() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [origen, setOrigen] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [busy, setBusy] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  // estado local del formulario ANEXO_03
  const [form03, setForm03] = useState<Anexo03Datos>({});

  const isInspector = useMemo(() => {
    const roleBase = up(user?.role);
    const permisos: string[] = Array.isArray((user as any)?.permisos)
      ? (user as any).permisos
      : [];
    return roleBase === "PERMISIONARIO" && permisos.map(up).includes("INSPECTOR");
  }, [user]);

  useEffect(() => {
    if (!id) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setErr("");
    setInfoMsg("");

    try {
      const res = await http.get(`/formularios/${id}`);
      const a = res?.data?.anexo as Anexo | undefined;
      const o = res?.data?.origen ?? null;

      if (!a) {
        setAnexo(null);
        setOrigen(null);
        setErr("La página solicitada no está disponible.");
        return;
      }

      setAnexo(a);
      setOrigen(o);

      // Si es ANEXO_03, prefill mínimo desde origen (ANEXO_02)
      const codigo = up(a.codigo);
      if (codigo === "ANEXO_03") {
        const d = a.datos && typeof a.datos === "object" ? a.datos : {};
        const od = o?.datos && typeof o.datos === "object" ? o.datos : {};

        const next: Anexo03Datos = {
          ...d,
          permisionarioNombre:
            d.permisionarioNombre ||
            od.postulanteLabel ||
            od.postulanteNombre ||
            "",
          unidadHabitacional:
            d.unidadHabitacional || od.viviendaLabel || od.viviendaCodigo || "",
          localidad: d.localidad || od.barrio || "",
          inspectorNombre: d.inspectorNombre || "",
        };

        setForm03(next);
      }
    } catch (e) {
      console.error("[INSPECTOR][ANEXO] Error cargando", e);
      setAnexo(null);
      setOrigen(null);
      setErr("La página solicitada no está disponible.");
    } finally {
      setLoading(false);
    }
  }

  // Enviar ANEXO_03: guarda datos (sanitizados) + cambia estado BORRADOR → ENVIADO
  async function enviarAnexo03() {
    if (!anexo?._id) return;

    setBusy(true);
    setErr("");
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/enviar`, {
        datos: form03,
      });

      // Si el backend devuelve anexo actualizado, lo usamos; sino recargamos
      const updated =
        res?.data?.anexo || res?.data?.formulario || res?.data || null;

      if (updated && typeof updated === "object" && updated._id) {
        setAnexo(updated as Anexo);

        // mantener form03 sincronizado si backend devolvió datos sanitizados
        const ud = (updated as any)?.datos;
        if (ud && typeof ud === "object") {
          setForm03(ud as Anexo03Datos);
        }
      } else {
        await cargar();
      }

      setInfoMsg("Formulario enviado correctamente.");
    } catch (e: any) {
      console.error("[ANEXO_03] Error enviando formulario", e);
      setErr(
        e?.response?.data?.message ||
          "No se pudo enviar el formulario. Por favor, contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  // Fail-closed UX
  if (!user || !isInspector) {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (!anexo) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio")}>
          Volver
        </button>
        {err && <div style={{ marginTop: 12, color: "#b71c1c" }}>{err}</div>}
      </div>
    );
  }

  const codigo = up(anexo.codigo);

  // ✅ ANEXO_03 — Mostrar formulario de recepción (editable si está BORRADOR)
  if (codigo === "ANEXO_03") {
    const estado = up(anexo.estado);
    const puedeEnviar = estado === "BORRADOR";
    const buttonStyle: CSSProperties = {
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.04)",
      color: "#ffffff",
      fontSize: 12,
      fontWeight: 700,
      cursor: busy ? "wait" : "pointer",
    };
    const primaryButtonStyle: CSSProperties = {
      ...buttonStyle,
      border: "none",
      background: "#16a34a",
      fontWeight: 800,
    };
    const alertErrorStyle: CSSProperties = {
      marginTop: 10,
      padding: 12,
      border: "1px solid rgba(239,68,68,0.35)",
      borderRadius: 12,
      background: "rgba(127,29,29,0.24)",
      color: "#fecaca",
      fontSize: 13,
      lineHeight: 1.45,
    };
    const alertSuccessStyle: CSSProperties = {
      marginTop: 10,
      padding: 12,
      border: "1px solid rgba(34,197,94,0.34)",
      borderRadius: 12,
      background: "rgba(20,83,45,0.22)",
      color: "#bbf7d0",
      fontSize: 13,
      lineHeight: 1.45,
    };

    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}
          style={{ ...buttonStyle, marginBottom: 12 }}
          disabled={busy}
        >
          Volver
        </button>

        <h2>Gestión — ANEXO_03</h2>

        {err && (
          <div style={alertErrorStyle}>
            {err}
          </div>
        )}

        {infoMsg && !err && (
          <div style={alertSuccessStyle}>
            {infoMsg}
          </div>
        )}

        {!puedeEnviar ? (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            Este formulario ya fue enviado y no puede editarse.
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 10, opacity: 0.85 }}>
            <b>Estado:</b> {safe(anexo.estado)}
            {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
            <br />
            <b>Vivienda:</b>{" "}
            {safe(origen?.datos?.viviendaLabel || origen?.datos?.viviendaCodigo)}
            <br />
            <b>Postulante:</b>{" "}
            {safe(
              origen?.datos?.postulanteLabel || origen?.datos?.postulanteNombre
            )}
          </div>

          <Anexo03InspectorForm
            value={form03}
            onChange={setForm03}
            readOnly={!puedeEnviar}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button onClick={cargar} disabled={busy} style={buttonStyle}>
            Recargar
          </button>

          <button
            onClick={enviarAnexo03}
            disabled={busy || !puedeEnviar}
            style={{
              ...primaryButtonStyle,
              opacity: busy || !puedeEnviar ? 0.65 : 1,
              cursor: busy || !puedeEnviar ? "not-allowed" : "pointer",
            }}
            title={
              puedeEnviar
                ? "Enviar formulario ANEXO_03 (BORRADOR → ENVIADO)"
                : "Solo disponible en estado BORRADOR"
            }
          >
            {busy ? "Enviando…" : "Enviar formulario"}
          </button>
        </div>
      </div>
    );
  }

  // ✅ Mantengo tu caso ANEXO_04 intacto
  if (codigo === "ANEXO_04") {
    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio")}
          style={{ marginBottom: 12 }}
        >
          Volver
        </button>

        <h2>Gestión — ANEXO_04</h2>

        {err && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #f44336",
              background: "#ffebee",
            }}
          >
            {err}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Anexo04Vista datos={anexo.datos} />
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={cargar}>Recargar</button>
        </div>
      </div>
    );
  }

  // ✅ Nuevo soporte explícito para ANEXO_11
  if (codigo === "ANEXO_11") {
    return (
      <GestionarAnexo11Inspector
        anexo={anexo}
        user={user}
        onReload={cargar}
      />
    );
  }

// ✅ Nuevo soporte explícito para ANEXO_09

if (codigo === "ANEXO_09") {
  const pageStyle: CSSProperties = {
    padding: "clamp(16px, 3vw, 28px)",
    display: "grid",
    gap: 14,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
  const buttonStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.08)",
    color: "#f8fafc",
    fontWeight: 800,
    padding: "10px 14px",
    cursor: "pointer",
  };
  const headerPanelStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
    padding: 16,
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0,
  };
  const titleStyle: CSSProperties = {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: 850,
    margin: 0,
  };
  const subtitleStyle: CSSProperties = {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 6,
  };
  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 16px 42px rgba(0,0,0,0.20)",
    padding: 16,
    minWidth: 0,
    boxSizing: "border-box",
  };
  const metaGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  };
  const metaItemStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    padding: 12,
    minWidth: 0,
  };
  const metaLabelStyle: CSSProperties = {
    display: "block",
    marginBottom: 4,
    color: "rgba(255,255,255,0.56)",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
  const metaValueStyle: CSSProperties = {
    color: "#f8fafc",
    fontSize: 13,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  };

  return (
    <div style={pageStyle}>
      <div style={headerPanelStyle}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio-inspector/gestiones")}
          style={buttonStyle}
        >
          Volver
        </button>

        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h2 style={titleStyle}>Gestion - ANEXO_09</h2>
          <div style={subtitleStyle}>
            Acta de entrega de vivienda fiscal en modo consulta institucional.
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={metaGridStyle}>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Estado</span>
            <span style={metaValueStyle}>{safe(anexo.estado)}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Estado institucional</span>
            <span style={metaValueStyle}>{safe(anexo.estadoInstitucional)}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Creado</span>
            <span style={metaValueStyle}>{safe(anexo.createdAt)}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Actualizado</span>
            <span style={metaValueStyle}>{safe(anexo.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <AnexoViewer codigo={anexo.codigo} datos={anexo.datos || {}} />
      </div>
    </div>
  );
}
  // ✅ Nuevo soporte explícito para ANEXO_08
  if (codigo === "ANEXO_08") {
    const estado = up(anexo.estado);
    const puedeEditar08 = estado === "BORRADOR" || estado === "ENVIADO";
    const pageStyle: CSSProperties = {
      padding: "clamp(16px, 3vw, 28px)",
      display: "grid",
      gap: 14,
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
    };
    const buttonStyle: CSSProperties = {
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 12,
      background: "rgba(255,255,255,0.08)",
      color: "#f8fafc",
      fontWeight: 800,
      padding: "10px 14px",
      cursor: busy ? "wait" : "pointer",
    };
    const titleStyle: CSSProperties = {
      color: "#f8fafc",
      fontSize: 22,
      fontWeight: 800,
      margin: 0,
    };
    const alertErrorStyle: CSSProperties = {
      padding: 12,
      border: "1px solid rgba(239,68,68,0.35)",
      borderRadius: 12,
      background: "rgba(127,29,29,0.24)",
      color: "#fecaca",
      fontSize: 13,
      lineHeight: 1.45,
    };
    const alertSuccessStyle: CSSProperties = {
      padding: 12,
      border: "1px solid rgba(34,197,94,0.34)",
      borderRadius: 12,
      background: "rgba(20,83,45,0.22)",
      color: "#bbf7d0",
      fontSize: 13,
      lineHeight: 1.45,
    };
    const headerPanelStyle: CSSProperties = {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 16,
      background: "rgba(255,255,255,0.05)",
      boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
      padding: 16,
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
      minWidth: 0,
    };
    const actionBarStyle: CSSProperties = {
      ...headerPanelStyle,
      justifyContent: "flex-end",
      padding: 12,
      boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
    };

    return (
      <div style={pageStyle}>
        <div style={headerPanelStyle}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}
          style={buttonStyle}
          disabled={busy}
        >
          Volver
        </button>

        <h2 style={titleStyle}>Gestión — ANEXO_08</h2>
        </div>

        {err && (
          <div
            style={alertErrorStyle}
          >
            {err}
          </div>
        )}

        {infoMsg && !err && (
          <div
            style={alertSuccessStyle}
          >
            {infoMsg}
          </div>
        )}

        <Anexo08InspectorForm
          value={(anexo.datos || {}) as Anexo08Datos}
          onChange={(next) =>
            setAnexo((prev) => (prev ? { ...prev, datos: next } : prev))
          }
          readOnly={!puedeEditar08}
          onEnviar={async (payload) => {
  if (!anexo?._id) return;

  setBusy(true);
  setErr("");
  setInfoMsg("");

  try {
    const res = await http.post(`/formularios/${anexo._id}/anexo-08/datos`, {
  datos: payload,
});

    const updated =
      res?.data?.anexo || res?.data?.formulario || res?.data || null;

    if (updated && typeof updated === "object" && updated._id) {
      setAnexo(updated as Anexo);
    } else {
      await cargar();
    }

    setInfoMsg("ANEXO_08 guardado correctamente.");
  } catch (e: any) {
    console.error("[ANEXO_08] Error guardando", e);
    setErr(
      e?.response?.data?.message ||
        "No se pudo guardar el ANEXO_08. Por favor, contacte al administrador."
    );
  } finally {
    setBusy(false);
  }
}}
          enviando={busy}
          enviarLabel="Guardar / enviar ANEXO_08"
        />

        <div style={actionBarStyle}>
          <button onClick={cargar} disabled={busy} style={buttonStyle}>
            Recargar
          </button>
        </div>
      </div>
    );
  }

  // Resto: fail-closed
  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => navigate("/app/permisionario/mi-barrio")}>
        Volver
      </button>
      <div style={{ marginTop: 12, color: "#b71c1c" }}>
        La página solicitada no está disponible.
      </div>
    </div>
  );
}
