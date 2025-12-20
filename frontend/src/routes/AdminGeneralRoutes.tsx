import { Routes, Route } from "react-router-dom";
import RequireAuth from "../guards/RequireAuth";
import RequireRole from "../guards/RequireRole";
import AuthLayout from "../layouts/AuthLayout";
import AdminDashboard from "../pages/admin_general/AdminDashboard";
import AdminStats from "../pages/admin_general/AdminStats";

export default function AdminGeneralRoutes() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole roles={["ADMIN_GENERAL"]}>
              <AuthLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="stats" element={<AdminStats />} />
      </Route>
    </Routes>
  );
}
