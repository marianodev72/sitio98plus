// src/pages/RegisterPage.jsx

import { useState } from "react";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    matricula: "",
    grado: "",
    dni: "",
    email: "",
    password: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // PASO 1: /register-init
  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const { nombre, apellido, matricula, dni, email, password } = formData;

    if (!nombre || !apellido || !matricula || !dni || !email || !password) {
      setError("Por favor, completá todos los campos obligatorios.");
      return;
    }

    try {
      setCargando(true);

      const resp = await fetch(`${API_BASE_URL}/api/users/register-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.message || "Error iniciando registro.");
      }

      setMensaje(
        data.message ||
          "Se envió un código de verificación a tu correo. Revisá tu bandeja de entrada."
      );
      setStep(2);
    } catch (err) {
      console.error("Error en register-init:", err);
      setError(err.message || "Ocurrió un error al iniciar el registro.");
    } finally {
      setCargando(false);
    }
  };

  // PASO 2: /register-verify
  const handleSubmitStep2 = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!formData.email || !verificationCode) {
      setError("Ingresá tu email y el código recibido.");
      return;
    }

    try {
      setCargando(true);

      const resp = await fetch(`${API_BASE_URL}/api/users/register-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.message || "Error verificando el código.");
      }

      setMensaje(
        data.message ||
          "Registro completado correctamente. Ya podés iniciar sesión desde la pantalla de login."
      );
    } catch (err) {
      console.error("Error en register-verify:", err);
      setError(err.message || "Ocurrió un error al verificar el código.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl shadow-black/40 p-8">
          <h1 className="text-2xl font-semibold text-center mb-2">
            Registro de usuario
          </h1>
          <p className="text-sm text-slate-300 text-center mb-6">
            Completá tus datos personales. Se validará tu matrícula y recibirás
            un código por correo.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mb-4 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 text-sm text-emerald-200">
              {mensaje}
            </div>
          )}

          {/* Pasos */}
          <div className="flex justify-center gap-4 mb-6 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step === 1 ? "bg-sky-500" : "bg-slate-600"
                }`}
              >
                1
              </div>
              <span>Datos personales</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step === 2 ? "bg-sky-500" : "bg-slate-600"
                }`}
              >
                2
              </div>
              <span>Código de verificación</span>
            </div>
          </div>

          {/* FORM PASO 1 */}
          {step === 1 && (
            <form onSubmit={handleSubmitStep1} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Nombre*</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Apellido*</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Matrícula*</label>
                  <input
                    type="text"
                    name="matricula"
                    value={formData.matricula}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    Grado (opcional)
                  </label>
                  <input
                    type="text"
                    name="grado"
                    value={formData.grado}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">DNI*</label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Email*</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="ej: usuario@armada.mil.ar"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Clave*</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full mt-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-700 px-4 py-2 font-semibold text-sm shadow-lg shadow-sky-500/40 transition"
              >
                {cargando ? "Enviando..." : "Continuar"}
              </button>
            </form>
          )}

          {/* FORM PASO 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmitStep2} className="space-y-4">
              <p className="text-sm text-slate-300">
                Ingresá el código de verificación que recibiste en{" "}
                <span className="font-semibold">{formData.email}</span>.
              </p>

              <div>
                <label className="block text-sm mb-1">
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Ej: 123456"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full mt-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-700 px-4 py-2 font-semibold text-sm shadow-lg shadow-sky-500/40 transition"
              >
                {cargando ? "Verificando..." : "Finalizar registro"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
