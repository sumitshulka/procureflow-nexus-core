
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
}

const ProtectedRoute = ({ requiredRoles }: ProtectedRouteProps) => {
  const { user, userData, isLoading } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute check for path:", location.pathname);
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-procurement-600"></div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    console.log("User not authenticated, redirecting to login");
    // Save the current path to redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Log user data for debugging
  console.log("User data in ProtectedRoute:", userData);
  console.log("Required roles for route:", requiredRoles);
  
  // If the user has 'admin' role, always grant access regardless of required roles
  if (userData?.roles && Array.isArray(userData.roles) && userData.roles.some(role => 
    typeof role === 'string' && (
      role.toLowerCase() === 'admin' || 
      role.toLowerCase() === UserRole.ADMIN.toLowerCase()
    ))) {
    console.log("User has ADMIN role - granting access to all routes");
    return <Outlet />;
  }

  // If specific roles are required, check if user has at least one of them
  if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    console.log("Checking user roles:", userData?.roles);
    
    if (!userData?.roles || !Array.isArray(userData.roles) || userData.roles.length === 0) {
      console.log("No roles found for user, access denied");
      return (
        <Navigate 
          to="/unauthorized" 
          replace 
          state={{ requiredRoles }}
        />
      );
    }

    // Convert all role strings to lowercase for case-insensitive comparison
    const userRolesLower = userData.roles.map(role => String(role).toLowerCase());
    const requiredRolesLower = requiredRoles.map(role => String(role).toLowerCase());

    // Check if user has any of the required roles
    const hasRequiredRole = userRolesLower.some(userRole => 
      requiredRolesLower.includes(userRole)
    );

    if (!hasRequiredRole) {
      console.log("Access denied - user does not have any of the required roles");
      return (
        <Navigate 
          to="/unauthorized" 
          replace 
          state={{ requiredRoles }}
        />
      );
    }
  }

  // If authenticated and has required role (or no roles required), render the outlet
  console.log("Access granted to path:", location.pathname);
  return <Outlet />;
};

export default ProtectedRoute;
