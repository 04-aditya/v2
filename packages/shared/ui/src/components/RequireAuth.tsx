import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "sharedui/hooks/useAuth";


export interface RequireAuthProps {
  allowedRoles: string[]
}
const RequireAuth = ({ allowedRoles }:RequireAuthProps) => {
    const { auth } = useAuth();
    const location = useLocation();

    return (
      auth.user?.roles?.find(role => allowedRoles?.includes(role.name))
            ? <Outlet />
            : auth.user
                ? <Navigate to="/unauthorized" state={{ from: location }} replace />
                : <Navigate to="/login" state={{ from: location }} replace />
    );
}

export default RequireAuth;
