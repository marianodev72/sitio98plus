// frontend/src/pages/permisionario/inspector/GestionarAnexoInspector.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";
import Anexo04Vista from "../../../components/anexos/Anexo04Vista";
import Anexo03InspectorForm, {
  type Anexo03Datos,
} from "../../../components/anexos/Anexo03InspectorForm";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
  derivadoDe?: string;
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

    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}
          style={{ marginBottom: 12 }}
          disabled={busy}
        >
          Volver
        </button>

        <h2>Gestión — ANEXO_03</h2>

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

        {infoMsg && !err && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #4caf50",
              background: "#e8f5e9",
            }}
          >
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
          <button onClick={cargar} disabled={busy}>
            Recargar
          </button>

          <button
            onClick={enviarAnexo03}
            disabled={busy || !puedeEnviar}
            style={{ fontWeight: 700 }}
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