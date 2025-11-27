// src/router/AppRouter.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/home/Home";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

// Panel de postulante (antes "UserDashboard")
import UserDashboard from "../pages/UserDashboard";
import MisPostulacionesPage from "../pages/MisPostulacionesPage";
import PostulacionViviendaForm from "../pages/PostulacionViviendaForm";

// Panel de permisionario
import PermisionarioDashboard from "../pages/PermisionarioDashboard";
import PermisionarioMisDatos from "../pages/PermisionarioMisDatos";

// (Opcional) Rutas de admin, si ya las estás usando.
// Ajustá los paths si en tu proyecto son distintos.
import AdminPostulantesPage from "../pages/admin/AdminPostulantesPage";
import AdminViviendasPage from "../pages/admin/AdminViviendasPage";
// Si tenés más pantallas de admin, podés agregarlas acá.

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PÚBLICAS */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* PANEL POSTULANTE */}
        <Route path="/panel" element={<UserDashboard />} />
        <Route
          path="/mis-postulaciones"
          element={<MisPostulacionesPage />}
        />
        <Route
          path="/postulaciones/nueva"
          element={<PostulacionViviendaForm />}
        />

        {/* PANEL PERMISIONARIO */}
        <Route
          path="/permisionario"
          elem
