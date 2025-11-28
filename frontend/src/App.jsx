// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Páginas de permisionario
import PermisionarioDashboard from "./pages/PermisionarioDashboard.jsx";
import PermisionarioMisDatos from "./pages/PermisionarioMisDatos.jsx";
import PermisionarioMisServicios from "./pages/PermisionarioMisServicios.jsx";
import PermisionarioMisComunicaciones from "./pages/PermisionarioMisComunicaciones.jsx";
import PermisionarioGestiones from "./pages/PermisionarioGestiones.jsx";

// Anexo 11
import PermisionarioAnexo11Nuevo from "./pages/PermisionarioAnexo11Nuevo.jsx";
import PermisionarioGestionesMis from "./pages/PermisionarioGestionesMis.jsx";
import PermisionarioAnexo11Detalle from "./pages/PermisionarioAnexo11Detalle.jsx";

// Anexo 3
import PermisionarioGestionesMisAnexo3 from "./pages/PermisionarioGestionesMisAnexo3.jsx";
import PermisionarioAnexo3Detalle from "./pages/PermisionarioAnexo3Detalle.jsx";

// Anexo 4 – Permisionario
import PermisionarioAnexo4Nuevo from "./pages/PermisionarioAnexo4Nuevo.jsx";
import PermisionarioAnexo4Mis from "./pages/PermisionarioAnexo4Mis.jsx";
import PermisionarioAnexo4Detalle from "./pages/PermisionarioAnexo4Detalle.jsx";

// Anexo 4 – Jefe de Barrio
import JefeBarrioAnexo4Listado from "./pages/JefeBarrioAnexo4Listado.jsx";
import JefeBarrioAnexo4Detalle from "./pages/JefeBarrioAnexo4Detalle.jsx";

// Anexo 4 – Administración
import AdministracionAnexo4Listado from "./pages/AdministracionAnexo4Listado.jsx";
import AdministracionAnexo4Detalle from "./pages/AdministracionAnexo4Detalle.jsx";

function App() {
  return (
    <Routes>
      {/* Dashboard permisionario */}
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

      {/* Gestiones permisionario */}
      <Route
        path="/permisionario/mis-gestiones"
        element={<PermisionarioGestiones />}
      />

      {/* Anexo 11 – Permisionario */}
      <Route
        path="/permisionario/gestiones/anexo11/nuevo"
        element={<PermisionarioAnexo11Nuevo />}
      />
      <Route
        path="/permisionario/gestiones/mis"
        element={<PermisionarioGestionesMis />}
      />
      <Route
        path="/permisionario/gestiones/anexo11/:id"
        element={<PermisionarioAnexo11Detalle />}
      />

      {/* Anexo 3 – Permisionario */}
      <Route
        path="/permisionario/gestiones/anexo3/mis"
        element={<PermisionarioGestionesMisAnexo3 />}
      />
      <Route
        path="/permisionario/gestiones/anexo3/:id"
        element={<PermisionarioAnexo3Detalle />}
      />

      {/* Anexo 4 – Permisionario */}
      <Route
        path="/permisionario/gestiones/anexo4/nuevo"
        element={<PermisionarioAnexo4Nuevo />}
      />
      <Route
        path="/permisionario/gestiones/anexo4/mis"
        element={<PermisionarioAnexo4Mis />}
      />
      <Route
        path="/permisionario/gestiones/anexo4/:id"
        element={<PermisionarioAnexo4Detalle />}
      />

      {/* Anexo 4 – Jefe de Barrio */}
      <Route
        path="/jefe-barrio/gestiones/anexo4"
        element={<JefeBarrioAnexo4Listado />}
      />
      <Route
        path="/jefe-barrio/gestiones/anexo4/:id"
        element={<JefeBarrioAnexo4Detalle />}
      />

      {/* Anexo 4 – Administración */}
      <Route
        path="/administracion/gestiones/anexo4"
        element={<AdministracionAnexo4Listado />}
      />
      <Route
        path="/administracion/gestiones/anexo4/:id"
        element={<AdministracionAnexo4Detalle />}
      />
    </Routes>
  );
}

export default App;
