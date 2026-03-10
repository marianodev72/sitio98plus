// frontend/src/pages/Login.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const escudoArmada = useMemo(
    () => "/assets/institucional/escudos/armada-argentina.png",
    []
  );
  const escudoBase = useMemo(
    () => "/assets/institucional/escudos/base-naval-ushuaia.png",
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(
        "No es posible procesar su solicitud en este momento, intente más tarde o comuníquese con el Administrador."
      );
      return;
    }

    setLoading(true);
    try {
      await http.post("/auth/login", {
        email: email.trim(),
        password,
      });

      await refresh();
      navigate("/app", { replace: true });
    } catch {
      setError(
        "No es posible procesar su solicitud en este momento, intente más tarde o comuníquese con el Administrador."
      );
    } finally {
      setLoading(false);
    }
  }

  function volverAlInicio() {
    navigate("/", { replace: true });
  }

  const ESCUDO_SIZE = "clamp(52px, 4.6vw, 88px)";

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#eaf0ff" }}>
      {/* Header institucional */}
      <section
        aria-label="Encabezado institucional"
        style={{
          position: "relative",
          width: "100%",
          minHeight: 220,
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
              "radial-gradient(1200px 420px at 50% 0%, rgba(56,189,248,0.10) 0%, rgba(11,18,32,0.0) 60%), linear-gradient(180deg, rgba(11,18,32,0.10) 0%, rgba(11,18,32,0.70) 92%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 980,
            margin: "0 auto",
            padding: "18px 24px 22px",
            minHeight: 220,
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
              Ingreso al sistema
            </h1>

            <div
              style={{
                marginTop: 10,
                fontSize: "clamp(14px, 1.3vw, 16px)",
                fontWeight: 800,
                color: "rgba(255,255,255,0.86)",
                textShadow: "0 2px 10px rgba(0,0,0,0.55)",
              }}
            >
              Acceso institucional
            </div>
          </div>
        </div>
      </section>

      {/* Card de login */}
      <section style={{ padding: "22px 24px 24px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 12px 30px rgba(0,0,0,0.38)",
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
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
                <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
                  background:
                    "linear-gradient(180deg, rgba(56,189,248,0.26), rgba(56,189,248,0.12))",
                  color: "#ffffff",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            {error && (
              <div
                role="status"
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {error}
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
              El acceso y las funcionalidades se encuentran sujetos a validación institucional.
            </p>
          </div>
        </div>

        {/* ✅ Texto largo movido desde Home, más grande y legible */}
        <div style={{ maxWidth: 980, margin: "18px auto 0", padding: "0 24px" }}>
          <div
            style={{
              maxWidth: 860,
              margin: "0 auto",
              textAlign: "center",
              fontSize: "clamp(24px, 1.35vw, 19px)",
              lineHeight: 1.75,
              opacity: 0.92,
              color: "rgba(255,255,255,0.90)",
              textShadow: "0 2px 12px rgba(0,0,0,0.55)",
            }}
          >
            El Órgano Administrador de Viviendas Fiscales ZN98 tiene a su cargo la administración y el mantenimiento de las Viviendas Fiscales y los Alojamientos Navales de la Base Naval Ushuaia, bajo la dirección de la Autoridad de Asignación, trabaja de manera continua en la mejora de las instalaciones y en el uso eficiente de los recursos, con el propósito de brindar condiciones adecuadas y funcionales al Personal que presta servicios en la Zona Naval 98.
          </div>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 22, opacity: 0.62 }}>
          Base Naval Ushuaia – Armada Argentina
        </div>
      </section>
    </main>
  );
}
