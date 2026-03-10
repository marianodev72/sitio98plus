// frontend/src/pages/HomePublic.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalCarousel from "../components/InstitutionalCarousel";

export default function HomePublic() {
  const navigate = useNavigate();

  const escudoArmada = useMemo(
    () => "/assets/institucional/escudos/armada-argentina.png",
    []
  );

  const escudoBase = useMemo(
    () => "/assets/institucional/escudos/base-naval-ushuaia.png",
    []
  );

  const ARMADA_SIZE = "clamp(104px, 9.2vw, 176px)";
  const BASE_SIZE = "clamp(118px, 10.2vw, 196px)";
  const ESCUDO_EDGE_INSET = "clamp(14px, 3vw, 48px)";

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#eaf0ff" }}>
      <section
        aria-label="Portada institucional"
        style={{
          position: "relative",
          minHeight: "100vh",
          overflow: "hidden",
          background: "#08101d",
        }}
      >
        {/* Fondo */}
        <InstitutionalCarousel
          configUrl="/assets/institucional/carrusel/index.json"
          objectFit="cover"
          objectPosition="center 42%"
        />

        {/* Degradado inferior para legibilidad */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,18,32,0.16) 0%, rgba(11,18,32,0.52) 40%, rgba(11,18,32,0.92) 82%, rgba(11,18,32,0.96) 100%)",
            zIndex: 1,
          }}
        />

        {/* Escudos */}
        <img
          src={escudoArmada}
          alt="Escudo Armada Argentina"
          style={{
            position: "absolute",
            top: 18,
            left: ESCUDO_EDGE_INSET,
            width: ARMADA_SIZE,
            height: ARMADA_SIZE,
            objectFit: "contain",
            zIndex: 3,
            filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.75))",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <img
          src={escudoBase}
          alt="Escudo Base Naval Ushuaia"
          style={{
            position: "absolute",
            top: 18,
            right: ESCUDO_EDGE_INSET,
            width: BASE_SIZE,
            height: BASE_SIZE,
            objectFit: "contain",
            zIndex: 3,
            filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.75))",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Contenido */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            padding: "18px 24px 34px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 980,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}
          >
            {/* ✅ Títulos: subirlos MUCHO más
                - antes: translateY(-18px)
                - ahora: translateY(-120px) (ajustable fino)
            */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                paddingTop: 0,
                paddingBottom: 10,
                transform: "translateY(-120px)",
              }}
            >
              <div style={{ maxWidth: 980 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(40px, 4.1vw, 60px)",
                    fontWeight: 950,
                    letterSpacing: 0.6,
                    color: "#ffffff",
                    textShadow:
                      "0 2px 18px rgba(0,0,0,0.78), 0 0 28px rgba(255,255,255,0.16)",
                  }}
                >
                  BASE NAVAL USHUAIA ALCALDÍA ZN98
                </h1>

                {/* ✅ Subtítulo “SITIO 98” más cerca del título (menos margen) */}
                <div
                  style={{
                    marginTop: 10,
                    fontSize: "clamp(24px, 2.3vw, 34px)",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.92)",
                    textShadow: "0 2px 14px rgba(0,0,0,0.65)",
                    letterSpacing: 0.8,
                  }}
                >
                  SITIO 98
                </div>
              </div>
            </div>

            {/* Bloque inferior: título corto + botones */}
            <div
              style={{
                width: "100%",
                paddingBottom: 18,
                transform: "translateY(18px)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(26px, 2.4vw, 34px)",
                    fontWeight: 950,
                    letterSpacing: 0.25,
                    color: "#ffffff",
                    textShadow: "0 2px 14px rgba(0,0,0,0.65)",
                  }}
                >
                  ÓRGANO ADMINISTRADOR DE VIVIENDAS FISCALES ZN98
                </h2>
              </div>

              <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 760,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 18,
                    padding: 24,
                    boxShadow: "0 14px 34px rgba(0,0,0,0.44)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => navigate("/login")}
                      style={{
                        minWidth: 240,
                        padding: "16px 26px",
                        fontWeight: 950,
                        fontSize: 18,
                        borderRadius: 14,
                        border: "1px solid rgba(56,189,248,0.45)",
                        background:
                          "linear-gradient(180deg, rgba(56,189,248,0.30), rgba(56,189,248,0.14))",
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      INGRESO
                    </button>

                    <button
                      onClick={() => navigate("/registro-postulante")}
                      style={{
                        minWidth: 240,
                        padding: "16px 26px",
                        fontWeight: 950,
                        fontSize: 18,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "rgba(255,255,255,0.12)",
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      REGISTRO
                    </button>
                  </div>

                  <p
                    style={{
                      marginTop: 16,
                      fontSize: 13,
                      opacity: 0.78,
                      textAlign: "center",
                      lineHeight: 1.5,
                      textShadow: "0 2px 10px rgba(0,0,0,0.55)",
                    }}
                  >
                    El acceso y las funcionalidades se encuentran sujetos a validación institucional.
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  textAlign: "center",
                  fontSize: 12,
                  opacity: 0.66,
                  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
                }}
              >
                Base Naval Ushuaia – Armada Argentina
              </div>
            </div>
          </div>
        </div>

        <style>
          {`ranslateY
            @media (max-width: 640px) {
              /* En móviles subimos menos el bloque para que no se corte */
              section[aria-label="Portada institucional"] div[style*="translateY(-160px)"] {
                transform: translateY(-70px) !important;
              }
            }
          `}
        </style>
      </section>
    </main>
  );
}
