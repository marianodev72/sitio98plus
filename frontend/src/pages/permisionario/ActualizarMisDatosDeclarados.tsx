import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

type Campo = { key: string; label: string };

type Conviviente = {
  parentesco?: string; // "Cónyuge", "Hijo/a", "Otro"
  apellido?: string;
  nombre?: string;
  dni?: string;
  edad?: string;
  observaciones?: string;
};

type Mascota = {
  tipo?: string; // "Perro", "Gato", etc.
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

  // Form principal
  const [form, setForm] = useState<Record<string, any>>({});

  // Grupo conviviente / familiar
  const [convivientes, setConvivientes] = useState<Conviviente[]>([]);

  // Mascotas
  const [mascotas, setMascotas] = useState<Mascota[]>([]);

  // Motivo institucional (opcional)
  const [motivo, setMotivo] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function cargarBase() {
    setLoading(true);
    setError(null);
    setOkMsg(null);

    try {
      // Traemos varios para elegir “último aprobado”
      const res = await http.get("/formularios/mis-anexos?codigo=ANEXO_01&limit=50");
      const anexos = Array.isArray(res.data?.anexos) ? res.data.anexos : [];

      const aprobados = anexos
        .filter(isAprobado)
        .sort((a: any, b: any) => {
          const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
          const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
          return tb - ta;
        });

      const ultimo = aprobados[0] || null;
      setBase(ultimo);

      const datos = ultimo?.datos && typeof ultimo.datos === "object" ? ultimo.datos : {};

      // Precarga campos simples
      const next: Record<string, any> = {};
      campos.forEach((c) => (next[c.key] = datos[c.key] ?? ""));
      setForm(next);

      // Precarga convivientes (en tu JSON existe como "convivientes": [])
      const conv = safeArray<Conviviente>(datos?.convivientes).map((c) => ({
        parentesco: c?.parentesco ?? "",
        apellido: c?.apellido ?? "",
        nombre: c?.nombre ?? "",
        dni: c?.dni ?? "",
        edad: c?.edad ?? "",
        observaciones: c?.observaciones ?? "",
      }));
      setConvivientes(conv);

      // Precarga mascotas (en tu JSON existe como "mascotas": [])
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
    // Evita guardar filas completamente vacías
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
      // Armamos "datos" con campos + grupo conviviente + mascotas
      const datos = {
        ...form,
        convivientes: normalizeConvivientes(convivientes),
        mascotas: normalizeMascotas(mascotas),
      };

      // ⚠️ Endpoint backend a implementar:
      await http.post("/formularios/mis-datos-declarados/actualizar", {
        datos,
        motivo: motivo?.trim() || null,
        // opcional: referencia base para auditoría
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
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Actualizar mis datos</h2>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Toda modificación queda registrada con fecha y hora y genera alerta institucional.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => navigate("/app/permisionario/mis-datos")}>Volver</button>
          <button onClick={() => navigate("/app/permisionario/mis-datos/historial")}>Historial</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? <div>Cargando…</div> : null}

        {error ? (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              border: "1px solid #ffb3b3",
              background: "#fff3f3",
              borderRadius: 8,
            }}
          >
            <b>Error:</b> {error}
          </div>
        ) : null}

        {okMsg ? (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              border: "1px solid #b6f2c2",
              background: "#f0fff3",
              borderRadius: 8,
            }}
          >
            {okMsg}
          </div>
        ) : null}

        {!loading && !base ? (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            No se encontró un registro aprobado para tomar como base.
          </div>
        ) : null}

        {!loading && base ? (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8, background: "white" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
              Base:{" "}
              <b>
                {base?.createdAt ? new Date(base.createdAt).toLocaleString("es-AR") : "—"}
              </b>
            </div>

            {/* 1) Datos básicos */}
            <div style={{ display: "grid", gap: 10 }}>
              {campos.map((c) => (
                <div
                  key={c.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "240px 1fr",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <label style={{ fontWeight: 700 }}>{c.label}</label>
                  <input
                    value={form[c.key] ?? ""}
                    onChange={(e) => onChangeField(c.key, e.target.value)}
                    style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                  />
                </div>
              ))}
            </div>

            <hr style={{ margin: "16px 0" }} />

            {/* 2) Grupo conviviente */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Grupo conviviente / familiar</h3>
                <button type="button" onClick={addConviviente}>
                  Agregar integrante
                </button>
              </div>

              <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Parentesco</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Apellido</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Nombre</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>DNI</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Edad</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Obs.</th>
                      <th style={{ padding: 10, borderBottom: "1px solid #ddd" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {convivientes.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 10, opacity: 0.75 }}>
                          (sin datos)
                        </td>
                      </tr>
                    ) : null}

                    {convivientes.map((c, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <select
                            value={c.parentesco || ""}
                            onChange={(e) => updateConviviente(idx, { parentesco: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          >
                            <option value="">—</option>
                            <option value="Cónyuge">Cónyuge</option>
                            <option value="Hijo/a">Hijo/a</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={c.apellido || ""}
                            onChange={(e) => updateConviviente(idx, { apellido: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={c.nombre || ""}
                            onChange={(e) => updateConviviente(idx, { nombre: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={c.dni || ""}
                            onChange={(e) => updateConviviente(idx, { dni: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={c.edad || ""}
                            onChange={(e) => updateConviviente(idx, { edad: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={c.observaciones || ""}
                            onChange={(e) => updateConviviente(idx, { observaciones: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", width: 80 }}>
                          <button type="button" onClick={() => removeConviviente(idx)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                Nota: aquí se registran cónyuge, hijos u otros convivientes. Se guarda solo lo que tenga datos cargados.
              </div>
            </div>

            <hr style={{ margin: "16px 0" }} />

            {/* 3) Mascotas */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Mascotas</h3>
                <button type="button" onClick={addMascota}>
                  Agregar mascota
                </button>
              </div>

              <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Tipo</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Nombre</th>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Observaciones</th>
                      <th style={{ padding: 10, borderBottom: "1px solid #ddd" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {mascotas.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 10, opacity: 0.75 }}>
                          (sin datos)
                        </td>
                      </tr>
                    ) : null}

                    {mascotas.map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={m.tipo || ""}
                            onChange={(e) => updateMascota(idx, { tipo: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                            placeholder="Perro / Gato / etc."
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={m.nombre || ""}
                            onChange={(e) => updateMascota(idx, { nombre: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <input
                            value={m.observaciones || ""}
                            onChange={(e) => updateMascota(idx, { observaciones: e.target.value })}
                            style={{ width: "100%", padding: 6 }}
                          />
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", width: 80 }}>
                          <button type="button" onClick={() => removeMascota(idx)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <hr style={{ margin: "16px 0" }} />

            {/* 4) Motivo + acciones */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 10, alignItems: "start" }}>
              <label style={{ fontWeight: 700 }}>Motivo (opcional)</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={guardar} disabled={saving} style={{ fontWeight: 900 }}>
                {saving ? "Guardando…" : "Registrar actualización"}
              </button>
              <button onClick={cargarBase} disabled={saving}>
                Recargar base
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
