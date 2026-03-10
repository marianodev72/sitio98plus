// backend/middleware/turnstile.js
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let warnedMissingSecret = false;

function getTokenFromRequest(req) {
  // Body
  const bodyToken =
    req?.body?.captchaToken ||
    req?.body?.turnstileToken ||
    req?.body?.token ||
    "";

  if (bodyToken) return String(bodyToken);

  // Header (algunos front lo mandan así)
  const headerToken =
    req?.headers?.["x-turnstile-token"] ||
    req?.headers?.["cf-turnstile-response"] ||
    "";

  if (headerToken) return String(headerToken);

  return "";
}

/**
 * Factory: devuelve middleware.
 * Uso:
 *   router.post("/login", verifyTurnstile({ required: true }), controller.login)
 */
function verifyTurnstile(options = {}) {
  const { required = false } = options;

  return async (req, res, next) => {
    try {
      const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();

      // DEV: sin secret => skip + warn 1 vez
      if (!secret) {
        if (!warnedMissingSecret) {
          warnedMissingSecret = true;
          console.warn("[Turnstile] TURNSTILE_SECRET_KEY no configurada, se omite verificación.");
        }
        return next();
      }

      const token = getTokenFromRequest(req);

      if (!token) {
        if (required) return res.status(400).json({ message: "Captcha requerido" });
        return next();
      }

      const form = new URLSearchParams();
      form.set("secret", secret);
      form.set("response", token);
      if (req.ip) form.set("remoteip", req.ip);

      const resp = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!resp.ok) return res.status(400).json({ message: "Captcha inválido" });

      const data = await resp.json();
      if (!data?.success) return res.status(400).json({ message: "Captcha inválido" });

      return next();
    } catch (err) {
      console.error("[Turnstile] Error verificando:", err);
      // si hay secret, fallamos cerrado; si no hay, dejamos pasar
      const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
      if (secret) return res.status(400).json({ message: "Captcha inválido" });
      return next();
    }
  };
}

module.exports = { verifyTurnstile };
