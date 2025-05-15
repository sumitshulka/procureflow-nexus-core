
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
}

const ProtectedRoute = ({ requiredRoles }: ProtectedRouteProps) => {
  const { user, userData, isLoading } = useAuth();

  // If auth is loading, show nothing
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-procurement-600"></div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check if user has at least one of them
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => 
      userData?.roles.includes(role)
    );

    if (!hasRequiredRole) {
      // Redirect to unauthorized page or dashboard
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If authenticated and has required role, render the outlet
  return <Outlet />;
};

export default ProtectedRoute;
