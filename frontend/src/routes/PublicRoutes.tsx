import { Routes, Route } from "react-router-dom";
import HomePublic from "../pages/HomePublic";
import Login from "../pages/Login";

export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePublic />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
