// frontend/src/routes/ProtectedRoutes.tsx
import { Routes, Route } from "react-router-dom";
import RequireAuth from "../guards/RequireAuth";
import AuthLayout from "../layouts/AuthLayout";
import DashboardHome from "../pages/DashboardHome";

export default function ProtectedRoutes() {
  return (
    <Routes>
      <Route
        element={
          <RequireAuth>
            <AuthLayout />
          </RequireAuth>
        }
      >
        <Route path="/app" element={<DashboardHome />} />
      </Route>
    </Routes>
  );
}
