import { useEffect, useMemo, useState } from "react";
import http from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Item = {
  _id: string;
  viviendaCodigo: string;
  periodo: string;
  leidoPorUsuario?: boolean;
  fechaLectura?: string | null;
  requiereAdministracion?: boolean;
  alertaActiva?: boolean;
  servicios?: {
    electricidad?: number | null;
    gas?: number | null;
    agua?: number | null;
  };
  referenciasInstitucionales?: {
    dpeNumeroServicio?: string;
    camuzziNumeroServicio?: string;
    dpossNumeroServicio?: string;
  };
  observaciones?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function toStrMonto(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s;
}

function parseMontoOrNull(raw: string): number | null {
  const s = String(raw || "").trim();
  if (!s) return null;

  // Permitimos "1200", "1200.50", "1.200,50" etc.
  // Normalizamos: quitamos espacios y separadores de miles, y convertimos coma a punto.
  const normalized = s
    .replace(/\s+/g, "")
    .replace(/\./g, "") // miles
    .replace(",", "."); // decimal

  // fail-closed: si no es número válido, devolvemos NaN para que el caller bloquee
  const n = Number(normalized);
  if (!Number.isFinite(n)) return NaN as any;
  return n;
}

export default function ServiciosAdmin() {
  const { user } = useAuth();
  const isAdminGeneral = useMemo(() => up(user?.role) === "ADMIN_GENERAL", [user]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // filtros
  const [vivienda, setVivienda] = useState("");
  const [estado, setEstado] = useState<"all" | "leidos" | "noleidos">("all");

  // modal corrección
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const [obs, setObs] = useState("");
  const [electricidad, setElectricidad] = useState<string>("");
  const [gas, setGas] = useState<string>("");
  const [agua, setAgua] = useState<string>("");

  const [dpe, setDpe] = useState("");
  const [camuzzi, setCamuzzi] = useState("");
  const [dposs, setDposs] = useState("");

  async function cargar() {
    setLoading(true);
    setError(false);

    try {
      const params: any = { estado };
      if (vivienda.trim()) params.vivienda = vivienda.trim().toUpperCase();

      const { data } = await http.get("/servicios/admin/listado", { params });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpiarFiltros() {
    setVivienda("");
    setEstado("all");
    setTimeout(() => cargar(), 0);
  }

  function openPdf(id: string) {
    try {
      window.open(`/api/servicios/${id}/pdf`, "_blank", "noopener");
    } catch {
      setError(true);
    }
  }

  function openCorreccion(x: Item) {
    if (!isAdminGeneral) return;

    setSelected(x);
    setObs("");

    // ✅ Normalizamos a string SIEMPRE (evita crash/rareza)
    setElectricidad(toStrMonto(x.servicios?.electricidad));
    setGas(toStrMonto(x.servicios?.gas));
    setAgua(toStrMonto(x.servicios?.agua));

    setDpe(String(x.referenciasInstitucionales?.dpeNumeroServicio || ""));
    setCamuzzi(String(x.referenciasInstitucionales?.camuzziNumeroServicio || ""));
    setDposs(String(x.referenciasInstitucionales?.dpossNumeroServicio || ""));

    setOpen(true);
  }

  function closeCorreccion() {
    setOpen(false);
    setSelected(null);
    setObs("");
    setElectricidad("");
    setGas("");
    setAgua("");
    setDpe("");
    setCamuzzi("");
    setDposs("");
  }

  async function guardarCorreccion() {
    if (!selected) return;

    // Observación obligatoria
    if (!obs.trim()) {
      setError(true);
      return;
    }

    // Convertimos montos en forma estricta
    const e = parseMontoOrNull(electricidad);
    const g = parseMontoOrNull(gas);
    const a = parseMontoOrNull(agua);

    // fail-closed: si algún monto viene inválido, bloqueamos sin explicar
    if ([e, g, a].some((x) => typeof x === "number" && !Number.isFinite(x))) {
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      await http.patch(`/servicios/${selected._id}/corregir`, {
        observaciones: obs.trim(),
        servicios: {
          electricidad: e === null ? null : e,
          gas: g === null ? null : g,
          agua: a === null ? null : a,
        },
        referenciasInstitucionales: {
          dpeNumeroServicio: dpe.trim(),
          camuzziNumeroServicio: camuzzi.trim(),
          dpossNumeroServicio: dposs.trim(),
        },
      });

      closeCorreccion();
      await cargar();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Servicios — Administración</h2>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 12 }}>
          No es posible procesar su solicitud, contáctese con el Administrador
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Vivienda</div>
          <input
            value={vivienda}
            onChange={(e) => setVivienda(e.target.value)}
            placeholder="Ej: AB-401"
          />
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Lectura</div>
          <select value={estado} onChange={(e) => setEstado(e.target.value as any)}>
            <option value="all">Todos</option>
            <option value="leidos">Leídos</option>
            <option value="noleidos">No leídos</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button onClick={cargar} disabled={loading}>
            Aplicar
          </button>
          <button onClick={limpiarFiltros} disabled={loading}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div>Cargando…</div>
      ) : !items.length ? (
        <div>Sin resultados</div>
      ) : (
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th>Vivienda</th>
              <th>Período</th>
              <th>Lectura</th>
              <th>Pendiente Admin</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x._id}>
                <td>{x.viviendaCodigo}</td>
                <td>{x.periodo}</td>
                <td>{x.leidoPorUsuario ? "Leído" : "No leído"}</td>
                <td>{x.requiereAdministracion ? "Sí" : "No"}</td>
                <td>
                  <button onClick={() => openPdf(x._id)}>Ver PDF</button>{" "}
                  {isAdminGeneral ? <button onClick={() => openCorreccion(x)}>Corregir</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal corrección */}
      {open && selected ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={closeCorreccion}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 16,
              width: 720,
              maxWidth: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Corrección administrativa</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {selected.viviendaCodigo} — {selected.periodo}
                </div>
              </div>
              <button onClick={closeCorreccion}>Cerrar</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Observación (obligatoria)</div>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={3}
                style={{ width: "100%" }}
                placeholder="Observación institucional"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Electricidad (DPE)</div>
                <input value={electricidad} onChange={(e) => setElectricidad(e.target.value)} placeholder="Monto" />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Gas (CAMUZZI)</div>
                <input value={gas} onChange={(e) => setGas(e.target.value)} placeholder="Monto" />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Agua (DPOSS)</div>
                <input value={agua} onChange={(e) => setAgua(e.target.value)} placeholder="Monto" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>N° servicio DPE</div>
                <input value={dpe} onChange={(e) => setDpe(e.target.value)} />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>N° servicio CAMUZZI</div>
                <input value={camuzzi} onChange={(e) => setCamuzzi(e.target.value)} />
              </div>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>N° servicio DPOSS</div>
                <input value={dposs} onChange={(e) => setDposs(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={closeCorreccion} disabled={loading}>
                Cancelar
              </button>
              <button onClick={guardarCorreccion} disabled={loading}>
                Guardar corrección
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
