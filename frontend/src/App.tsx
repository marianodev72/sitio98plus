// frontend/src/App.tsx
import { Routes, Route } from "react-router-dom";
import PublicRoutes from "./routes/PublicRoutes";
import RoleRoutes from "./routes/RoleRoutes";

export default function App() {
  return (
    <Routes>
      {/* Rutas protegidas */}
      <Route path="/app/*" element={<RoleRoutes />} />

      {/* Rutas públicas */}
      <Route path="/*" element={<PublicRoutes />} />
    </Routes>
  );
}
