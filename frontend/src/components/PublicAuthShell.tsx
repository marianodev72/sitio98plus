// frontend/src/components/PublicAuthShell.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerNote?: string;
};

export default function PublicAuthShell({ title, subtitle, children, footerNote }: Props) {
  const navigate = useNavigate();

  const escudoArmada = useMemo(
    () => "/assets/institucional/escudos/armada-argentina.png",
    []
  );
  const escudoBase = useMemo(
    () => "/assets/institucional/escudos/base-naval-ushuaia.png",
    []
  );

  const ESCUDO_SIZE = "clamp(52px, 4.6vw, 88px)";

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#eaf0ff" }}>
      {/* Header institucional (sin carrusel) */}
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
        {/* Overlay suave */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1200px 400px at 50% 0%, rgba(56,189,248,0.10) 0%, rgba(11,18,32,0.0) 60%), linear-gradient(180deg, rgba(11,18,32,0.10) 0%, rgba(11,18,32,0.65) 92%)",
          }}
        />

        {/* Contenedor centrado */}
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
          {/* Barra superior: escudos + volver */}
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
              onClick={() => navigate("/")}
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
              Volver al inicio
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

          {/* Títulos */}
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
              {title}
            </h1>

            {subtitle ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: "clamp(14px, 1.3vw, 16px)",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.86)",
                  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Cuerpo */}
      <section style={{ padding: "22px 24px 42px" }}>
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
            {children}

            {footerNote ? (
              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  opacity: 0.78,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {footerNote}
              </p>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, opacity: 0.62 }}>
          Base Naval Ushuaia – Armada Argentina
        </div>
      </section>
    </main>
  );
}
