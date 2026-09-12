import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Brand from "../components/Brand.jsx";

export default function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="wrap">
      <div className="section-title">
        <Brand subtitle="Espace admin" />
        <button className="btn btn-ghost btn-sm" onClick={signOut}>
          Se déconnecter
        </button>
      </div>
      <div className="admin-tabs">
        <NavLink to="calendrier" className={({ isActive }) => (isActive ? "active" : "")}>
          Calendrier
        </NavLink>
        <NavLink to="adherents" className={({ isActive }) => (isActive ? "active" : "")}>
          Adhérents
        </NavLink>
        <NavLink to="recap" className={({ isActive }) => (isActive ? "active" : "")}>
          Récapitulatif
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}
