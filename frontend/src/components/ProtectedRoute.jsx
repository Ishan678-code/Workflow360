import { Navigate, Outlet, useLocation } from "react-router-dom";

const roleHomes = {
  ADMIN: "/admin/dashboard",
  MANAGER: "/manager/dashboard",
  EMPLOYEE: "/employee/dashboard",
  FREELANCER: "/freelancer/dashboard",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user?.role) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomes[user.role] || "/"} replace />;
  }

  return <Outlet />;
}

