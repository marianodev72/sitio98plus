// frontend/src/pages/admin_general/Perfil.tsx

import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { http } from "../../api/http";

export default function PerfilAdminGeneral() {
  const { user, refresh } = useAuth();

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [regenCode, setRegenCode] = useState("");
  const [regenRecoveryCodes, setRegenRecoveryCodes] = useState<string[]>([]);

  async function handleStart() {
    setLoading(true);
    setMessage(null);
    setRecoveryCodes([]);
    setRegenRecoveryCodes([]);

    try {
      const { data } = await http.post("/auth/mfa/enroll/start");

      setQrUrl(data.qrUrl);
      setSecret(data.secret);
    } catch {
      setMessage("No se pudo iniciar el enrolamiento MFA.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setMessage(null);

    try {
      const { data } = await http.post("/auth/mfa/enroll/confirm", {
        code,
      });

      setMessage(
        "MFA activado correctamente. Guardá los códigos de recuperación en un lugar seguro: solo se muestran una vez."
      );
      setQrUrl(null);
      setSecret(null);
      setCode("");
      setRecoveryCodes(Array.isArray(data?.recoveryCodes) ? data.recoveryCodes : []);
      setRegenRecoveryCodes([]);

      await refresh();
    } catch {
      setMessage("Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyRecoveryCodes() {
    try {
      if (!recoveryCodes.length) return;
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setMessage("Códigos de recuperación copiados.");
    } catch {
      setMessage("No se pudieron copiar los códigos.");
    }
  }

  async function handleRegenerateRecoveryCodes() {
    setLoading(true);
    setMessage(null);

    try {
      const { data } = await http.post("/auth/mfa/recovery/regenerate", {
        code: regenCode,
      });

      setRegenRecoveryCodes(Array.isArray(data?.recoveryCodes) ? data.recoveryCodes : []);
      setRegenCode("");
      setMessage(
        "Códigos de recuperación regenerados correctamente. Guardalos ahora: solo se muestran una vez."
      );
      setRecoveryCodes([]);
    } catch (e: any) {
      const msg =
        String(e?.response?.data?.message || "").trim() ||
        "No se pudieron regenerar los códigos.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyRegeneratedCodes() {
    try {
      if (!regenRecoveryCodes.length) return;
      await navigator.clipboard.writeText(regenRecoveryCodes.join("\n"));
      setMessage("Nuevos códigos de recuperación copiados.");
    } catch {
      setMessage("No se pudieron copiar los nuevos códigos.");
    }
  }

  const sectionStyle = {
    display: "grid",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
  } as const;

  const labelStyle = {
    fontSize: 13,
    fontWeight: 900,
    color: "rgba(255,255,255,0.92)",
  } as const;

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box" as const,
  };

  const primaryButtonStyle = {
    padding: "12px 18px",
    fontWeight: 900,
    fontSize: 15,
    borderRadius: 12,
    border: "1px solid rgba(56,189,248,0.40)",
    background:
      "linear-gradient(180deg, rgba(56,189,248,0.26), rgba(56,189,248,0.12))",
    color: "#ffffff",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.8 : 1,
  } as const;

  const secondaryButtonStyle = {
    padding: "12px 18px",
    fontWeight: 900,
    fontSize: 15,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.8 : 1,
  } as const;

  const codeCardStyle = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontFamily: "monospace",
    fontSize: 14,
    letterSpacing: 1,
    color: "#ffffff",
    textAlign: "center" as const,
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#ffffff" }}>
          Perfil
        </h2>
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.5,
          }}
        >
          Configuración de seguridad y estado actual de autenticación.
        </div>
      </div>

      <div style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Usuario</div>
            <div style={{ color: "#ffffff", fontSize: 15 }}>
              {user?.nombre} {user?.apellido}
            </div>
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Email</div>
            <div style={{ color: "#ffffff", fontSize: 15 }}>
              {user?.email}
            </div>
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>MFA</div>
            <div style={{ color: "#ffffff", fontSize: 15 }}>
              {user?.mfaEnabled ? "Activo" : "No configurado"}
            </div>
          </div>
        </div>

        {!qrUrl && !user?.mfaEnabled && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button onClick={handleStart} disabled={loading} style={primaryButtonStyle}>
              Activar MFA
            </button>
          </div>
        )}
      </div>

      {qrUrl && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#ffffff" }}>
            Activación de MFA
          </div>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
            Escaneá el código QR con Google Authenticator o ingresá el código manual.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: 220,
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <img src={qrUrl} alt="QR MFA" style={{ width: 200, height: 200, borderRadius: 8 }} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: 6 }}>Código manual</div>
                <div style={codeCardStyle}>{secret}</div>
              </div>

              <div>
                <div style={{ ...labelStyle, marginBottom: 6 }}>Código de 6 dígitos</div>
                <input
                  placeholder="Ingresá el código actual"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={handleConfirm} disabled={loading} style={primaryButtonStyle}>
                  Confirmar MFA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.mfaEnabled && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#ffffff" }}>
            Regenerar códigos de recuperación
          </div>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
            Ingresá un código MFA actual para emitir nuevos códigos de recuperación. Esto invalida los anteriores.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={labelStyle}>Código MFA actual</div>
            <input
              placeholder="Código MFA actual"
              value={regenCode}
              onChange={(e) => setRegenCode(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleRegenerateRecoveryCodes} disabled={loading} style={primaryButtonStyle}>
              Regenerar códigos
            </button>
          </div>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#ffffff" }}>
            Códigos de recuperación
          </div>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
            Guardalos ahora. Cada código sirve una sola vez y después no se podrá volver a mostrar.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {recoveryCodes.map((item) => (
              <div key={item} style={codeCardStyle}>
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleCopyRecoveryCodes} type="button" style={secondaryButtonStyle}>
              Copiar códigos
            </button>
          </div>
        </div>
      )}

      {regenRecoveryCodes.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#ffffff" }}>
            Nuevos códigos de recuperación
          </div>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
            Guardalos ahora. Los anteriores quedaron invalidados y estos también se muestran una sola vez.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {regenRecoveryCodes.map((item) => (
              <div key={item} style={codeCardStyle}>
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleCopyRegeneratedCodes} type="button" style={secondaryButtonStyle}>
              Copiar nuevos códigos
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
            color: "#ffffff",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}