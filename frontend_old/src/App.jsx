// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";

// Páginas principales
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPostulantesPage from "./pages/admin/AdminPostulantesPage";
import AdminPostulacionDetallePage from "./pages/admin/AdminPostulacionDetallePage";
import AdminViviendasPage from "./pages/admin/AdminViviendasPage";

function App() {
  return (
    <Routes>
      {/* Página inicial del portal */}
      <Route path="/" element={<Home />} />

      {/* Autenticación */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ADMIN */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/postulantes" element={<AdminPostulantesPage />} />
      <Route
        path="/admin/postulaciones/:id"
        element={<AdminPostulacionDetallePage />}
      />
      <Route path="/admin/viviendas" element={<AdminViviendasPage />} />

      {/* Cualquier otra ruta → inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
