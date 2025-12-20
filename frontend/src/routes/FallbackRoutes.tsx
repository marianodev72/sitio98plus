import { Routes, Route } from "react-router-dom";
import Unavailable from "../pages/Unavailable";

export default function FallbackRoutes() {
  return (
    <Routes>
      <Route path="/unavailable" element={<Unavailable />} />
      {/* Catch-all */}
      <Route path="*" element={<Unavailable />} />
    </Routes>
  );
}
