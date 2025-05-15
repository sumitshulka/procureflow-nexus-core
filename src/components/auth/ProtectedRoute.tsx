
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
  console.log("User data in ProtectedRoute:", userData);
  console.log("Required roles for route:", requiredRoles);
  
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
    return <Navigate to="/login" replace />;
  }

  // If the user has 'admin' role, always grant access regardless of required roles
  if (userData?.roles && userData.roles.some(role => 
    role.toLowerCase() === 'admin' || role.toLowerCase() === UserRole.ADMIN.toLowerCase())) {
    console.log("User has ADMIN role - granting access to all routes");
    return <Outlet />;
  }

  // If specific roles are required, check if user has at least one of them
  if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    console.log("Checking user roles:", userData?.roles);
    console.log("Against required roles:", requiredRoles);
    
    if (!userData?.roles || userData.roles.length === 0) {
      console.log("No roles found for user, access denied");
      return (
        <Navigate 
          to="/unauthorized" 
          replace 
          state={{ requiredRoles }} // Pass as object, not string
        />
      );
    }

    // Convert all role strings to lowercase for case-insensitive comparison
    const userRolesLower = userData.roles.map(role => String(role).toLowerCase());
    const requiredRolesLower = requiredRoles.map(role => String(role).toLowerCase());

    console.log("Normalized user roles:", userRolesLower);
    console.log("Normalized required roles:", requiredRolesLower);

    // Check if user has any of the required roles using explicit loop for better debugging
    let hasRequiredRole = false;
    for (const userRole of userRolesLower) {
      if (requiredRolesLower.includes(userRole)) {
        console.log(`Required role match found: ${userRole}`);
        hasRequiredRole = true;
        break;
      }
    }

    console.log("Has required role:", hasRequiredRole);

    if (!hasRequiredRole) {
      console.log("Access denied - user does not have any of the required roles");
      return (
        <Navigate 
          to="/unauthorized" 
          replace 
          state={{ requiredRoles }} // Pass as object, not string
        />
      );
    }
  }

  // If authenticated and has required role (or no roles required), render the outlet
  console.log("Access granted to path:", location.pathname);
  return <Outlet />;
};

export default ProtectedRoute;
