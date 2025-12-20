import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function RegisterPostulante() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    matricula: "",
    grado: "",
    nombre: "",
    apellido: "",
    password: "",
    confirmarPassword: "",
    captchaToken: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const captchaDivRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Renderizar Turnstile cuando existe window.turnstile + el div
  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    // Si no configuraste el .env todavía, no explota: solo no renderiza
    if (!siteKey) {
      console.warn("[Turnstile] Falta VITE_TURNSTILE_SITE_KEY en frontend/.env");
      return;
    }

    const interval = setInterval(() => {
      if (!captchaDivRef.current) return;
      if (!window.turnstile) return;

      // Evitar render doble
      if (widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(captchaDivRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          setForm((prev) => ({ ...prev, captchaToken: token }));
        },
        "expired-callback": () => {
          setForm((prev) => ({ ...prev, captchaToken: "" }));
        },
        "error-callback": () => {
          setForm((prev) => ({ ...prev, captchaToken: "" }));
        },
      });

      clearInterval(interval);
    }, 200);

    return () => {
      clearInterval(interval);
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage(null);

    try {
      await http.post("/auth/register-postulante", {
        email: form.email,
        matricula: form.matricula,
        grado: form.grado,
        nombre: form.nombre,
        apellido: form.apellido,
        password: form.password,
        confirmarPassword: form.confirmarPassword,
        captchaToken: form.captchaToken, // ✅ token real
      });

      setMessage("Registro recibido. Su solicitud será evaluada por el administrador.");

      // Reset captcha para que no reusen el token
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }

      setForm((prev) => ({ ...prev, captchaToken: "" }));
    } catch (err) {
      // Mensaje genérico SIEMPRE (seguridad)
      setMessage("No es posible procesar el registro en este momento.");
      setForm((prev) => ({ ...prev, captchaToken: "" }));

      // Reset por seguridad
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2>Registro de Postulante</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="email"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          name="matricula"
          placeholder="Matrícula"
          value={form.matricula}
          onChange={handleChange}
          required
        />

        <input
          name="grado"
          placeholder="Grado"
          value={form.grado}
          onChange={handleChange}
          required
        />

        <input
          name="apellido"
          placeholder="Apellido"
          value={form.apellido}
          onChange={handleChange}
          required
        />

        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
          required
        />

        <input
          name="password"
          placeholder="Contraseña"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <input
          name="confirmarPassword"
          placeholder="Confirmar contraseña"
          type="password"
          value={form.confirmarPassword}
          onChange={handleChange}
          required
        />

        {/* ✅ Turnstile real */}
        <div style={{ marginTop: 12 }}>
          <div ref={captchaDivRef} />
          {!import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <p style={{ marginTop: 8, color: "red" }}>
              Falta configurar VITE_TURNSTILE_SITE_KEY en frontend/.env
            </p>
          )}
        </div>

        <button type="submit" disabled={loading || !form.captchaToken}>
          {loading ? "Enviando..." : "Registrarme"}
        </button>
      </form>

      {message && <p style={{ marginTop: 16, fontWeight: "bold" }}>{message}</p>}

      <button style={{ marginTop: 16 }} onClick={() => navigate("/login")}>
        Volver al login
      </button>
    </div>
  );
}
