// src/api/postulacionesApi.js
import axios from "axios";

const API = "http://localhost:3000/api/postulaciones";

// ======================================================
// GET – todas las postulaciones (solo Admin)
// ======================================================
export async function getPostulaciones() {
  const res = await axios.get(API);
  return res.data;
}

// ======================================================
// GET – una postulación por ID
// ======================================================
export async function getPostulacionById(id) {
  const res = await axios.get(`${API}/${id}`);
  return res.data;
}

// ======================================================
// POST – crear nueva postulación (usuario)
// ======================================================
export async function crearPostulacion(formData) {
  const res = await axios.post(API, formData);
  return res.data;
}

// ======================================================
// PUT – cambiar estado (solo Admin)
// ======================================================
export async function updateEstado(id, estado) {
  const res = await axios.put(`${API}/${id}/estado`, { estado });
  return res.data;
}

// ======================================================
// DELETE – borrar postulación
// ======================================================
export async function deletePostulacion(id) {
  const res = await axios.delete(`${API}/${id}`);
  return res.data;
}

// ======================================================
// DESCARGAR PDF
// ======================================================
export function descargarPdf(id) {
  window.open(`${API}/${id}/pdf`, "_blank");
}

// ======================================================
// SUBIR ARCHIVOS (POSTULANTE)
// ======================================================
export async function subirArchivos(files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));

  const res = await axios.post(
    "http://localhost:3000/api/uploads/postulaciones",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return res.data;
}
