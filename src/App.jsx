import { Navigate, Route, Routes } from "react-router-dom";
import PublicHome from "./pages/PublicHome.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminCalendrier from "./pages/AdminCalendrier.jsx";
import AdminAdherents from "./pages/AdminAdherents.jsx";
import AdminRecap from "./pages/AdminRecap.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/admin/connexion" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="calendrier" replace />} />
        <Route path="calendrier" element={<AdminCalendrier />} />
        <Route path="adherents" element={<AdminAdherents />} />
        <Route path="recap" element={<AdminRecap />} />
        <Route path="utilisateurs" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
