// frontend/src/pages/RegisterPostulante.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";

type RegisterResponse = {
  status?: "PENDIENTE" | "NO_PROCESABLE";
  message?: string;
};

export default function RegisterPostulante() {
  const navigate = useNavigate();

  const escudoArmada = useMemo(
    () => "/assets/institucional/escudos/armada-argentina.png",
    []
  );

  const escudoBase = useMemo(
    () => "/assets/institucional/escudos/base-naval-ushuaia.png",
    []
  );

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    matricula: "",
    password: "",
    confirmarPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizarDni(v: string) {
    return v.replace(/[^\d]/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);

    // Validaciones mínimas front (UX)
    if (
      !form.nombre ||
      !form.apellido ||
      !form.email ||
      !form.dni ||
      !form.matricula ||
      !form.password ||
      !form.confirmarPassword
    ) {
      setMensaje("Por favor, complete todos los campos obligatorios.");
      return;
    }

    if (form.password !== form.confirmarPassword) {
      setMensaje("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await http.post<RegisterResponse>("/auth/register-postulante", {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        dni: normalizarDni(form.dni),
        matricula: form.matricula.trim(),
        password: form.password,
        confirmarPassword: form.confirmarPassword,
      });

      const status = res.data?.status;
      const msg = res.data?.message;

      if (status === "PENDIENTE") {
        setMensaje(
          msg ||
            "Su solicitud ha sido recibida y se encuentra en etapa de evaluación. Será notificado una vez aprobada."
        );

        setForm({
          nombre: "",
          apellido: "",
          email: "",
          dni: "",
          matricula: "",
          password: "",
          confirmarPassword: "",
        });
      } else {
        setMensaje(
          msg ||
            "No es posible procesar su solicitud en este momento, intente mas tarde o comuníquese con el Administrador"
        );
      }
    } catch {
      setMensaje(
        "No es posible procesar su solicitud en este momento, intente mas tarde o comuníquese con el Administrador"
      );
    } finally {
      setLoading(false);
    }
  }

  function volverAlInicio() {
    navigate("/", { replace: true });
  }

  function irALogin() {
    navigate("/login", { replace: true });
  }

  const ESCUDO_SIZE = "clamp(52px, 4.6vw, 88px)";

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#eaf0ff" }}>
      {/* Header institucional (sin carrusel) */}
      <section
        aria-label="Encabezado institucional"
        style={{
          position: "relative",
          width: "100%",
          minHeight: 240,
          background: "linear-gradient(180deg, #0b1220 0%, #08101d 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1200px 440px at 50% 0%, rgba(56,189,248,0.10) 0%, rgba(11,18,32,0.0) 60%), linear-gradient(180deg, rgba(11,18,32,0.10) 0%, rgba(11,18,32,0.72) 92%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 980,
            margin: "0 auto",
            padding: "18px 24px 22px",
            minHeight: 240,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <img
              src={escudoArmada}
              alt="Escudo Armada Argentina"
              style={{
                width: ESCUDO_SIZE,
                height: ESCUDO_SIZE,
                objectFit: "contain",
                filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.70))",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={volverAlInicio}
                style={{
                  padding: "10px 14px",
                  fontWeight: 900,
                  fontSize: 13,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                }}
              >
                ← Volver al inicio
              </button>

              <button
                type="button"
                onClick={irALogin}
                style={{
                  padding: "10px 14px",
                  fontWeight: 900,
                  fontSize: 13,
                  borderRadius: 12,
                  border: "1px solid rgba(56,189,248,0.38)",
                  background: "rgba(56,189,248,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                }}
              >
                Ir a ingreso
              </button>
            </div>

            <img
              src={escudoBase}
              alt="Escudo Base Naval Ushuaia"
              style={{
                width: ESCUDO_SIZE,
                height: ESCUDO_SIZE,
                objectFit: "contain",
                filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.70))",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 0.6,
                color: "rgba(255,255,255,0.85)",
                textTransform: "uppercase",
              }}
            >
              BASE NAVAL USHUAIA – ALCALDÍA ZN98
            </div>

            <h1
              style={{
                margin: "10px 0 0",
                fontSize: "clamp(26px, 2.4vw, 34px)",
                fontWeight: 950,
                color: "#ffffff",
                textShadow: "0 2px 14px rgba(0,0,0,0.70), 0 0 18px rgba(255,255,255,0.12)",
              }}
            >
              Registro de postulante
            </h1>

            <div
              style={{
                marginTop: 10,
                fontSize: "clamp(14px, 1.3vw, 16px)",
                fontWeight: 800,
                color: "rgba(255,255,255,0.86)",
                textShadow: "0 2px 10px rgba(0,0,0,0.55)",
                maxWidth: 860,
                marginInline: "auto",
                lineHeight: 1.45,
              }}
            >
              Complete el formulario con sus datos reales. El registro será evaluado por la administración antes de habilitar
              el acceso.
            </div>
          </div>
        </div>
      </section>

      {/* Card de registro */}
      <section style={{ padding: "22px 24px 42px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 700,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 12px 30px rgba(0,0,0,0.38)",
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              {/* Dos columnas en desktop, una en mobile */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Nombre *</span>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={onChange}
                    required
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      outline: "none",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Apellido *</span>
                  <input
                    type="text"
                    name="apellido"
                    value={form.apellido}
                    onChange={onChange}
                    required
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      outline: "none",
                    }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Email *</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                  autoComplete="email"
                  style={{
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#ffffff",
                    outline: "none",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>DNI *</span>
                  <input
                    type="text"
                    name="dni"
                    value={form.dni}
                    onChange={onChange}
                    placeholder="Ej: 12.345.678"
                    required
                    inputMode="numeric"
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      outline: "none",
                    }}
                  />
                  <small style={{ opacity: 0.75, fontSize: 12 }}>
                    Ingrese su DNI sin importar puntos o guiones.
                  </small>
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Matrícula *</span>
                  <input
                    type="text"
                    name="matricula"
                    value={form.matricula}
                    onChange={onChange}
                    required
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      outline: "none",
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Contraseña *</span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    required
                    autoComplete="new-password"
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      outline: "none",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Confirmar contraseña *</span>
                  <input
                    type="password"
                    name="confirmarPassword"
                    value={form.confirmarPassword}
                    onChange={onChange}
                    required
                    autoComplete="new-password"
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      outline: "none",
                    }}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  padding: "12px 18px",
                  fontWeight: 950,
                  fontSize: 16,
                  borderRadius: 12,
                  border: "1px solid rgba(56,189,248,0.40)",
                  background: "linear-gradient(180deg, rgba(56,189,248,0.26), rgba(56,189,248,0.12))",
                  color: "#ffffff",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? "Enviando..." : "Registrar"}
              </button>
            </form>

            {mensaje && (
              <div
                role="status"
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {mensaje}
              </div>
            )}

            <p
              style={{
                marginTop: 16,
                fontSize: 13,
                opacity: 0.78,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              La información se procesa conforme a validación institucional.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, opacity: 0.62 }}>
          Base Naval Ushuaia – Armada Argentina
        </div>
      </section>

      {/* Responsive básico sin CSS externo: en pantallas chicas, “dos columnas” se vuelve una */}
      <style>
        {`
          @media (max-width: 680px) {
            form > div[style*="grid-template-columns: repeat(2"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </main>
  );
}
