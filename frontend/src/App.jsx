// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Páginas de permisionario
import PermisionarioDashboard from "./pages/PermisionarioDashboard.jsx";
import PermisionarioMisDatos from "./pages/PermisionarioMisDatos.jsx";
import PermisionarioMisServicios from "./pages/PermisionarioMisServicios.jsx";
import PermisionarioMisComunicaciones from "./pages/PermisionarioMisComunicaciones.jsx";
import PermisionarioGestiones from "./pages/PermisionarioGestiones.jsx";
import PermisionarioAnexo11Nuevo from "./pages/PermisionarioAnexo11Nuevo.jsx";

// (Si tenés otras páginas, importalas también como antes)

function App() {
  return (
    <Routes>
      {/* Rutas de permisionario */}
      <Route path="/permisionario" element={<PermisionarioDashboard />} />
      <Route
        path="/permisionario/mis-datos"
        element={<PermisionarioMisDatos />}
      />
      <Route
        path="/permisionario/mis-servicios"
        element={<PermisionarioMisServicios />}
      />
      <Route
        path="/permisionario/mis-comunicaciones"
        element={<PermisionarioMisComunicaciones />}
      />
      <Route
        path="/permisionario/mis-gestiones"
        element={<PermisionarioGestiones />}
      />

      {/* Gestiones */}
      <Route
        path="/permisionario/gestiones/anexo11/nuevo"
        element={<PermisionarioAnexo11Nuevo />}
      />
      <Route
        path="/permisionario/gestiones/mis"
        element={
          <div style={{ color: "white", padding: "2rem" }}>
            Listado de mis gestiones (en construcción)
          </div>
        }
      />

      {/* Aquí seguirían el resto de rutas de tu app (login, postulante, etc.) */}
      {/* <Route path="/postulante" element={<PostulanteDashboard />} /> */}
    </Routes>
  );
}

export default App;
