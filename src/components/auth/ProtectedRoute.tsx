
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
  console.log("Required roles:", requiredRoles);
  
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
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check if user has at least one of them
  if (requiredRoles && requiredRoles.length > 0) {
    console.log("Checking user roles:", userData?.roles);
    console.log("Against required roles:", requiredRoles);
    
    // If userData is null or roles array is empty, user has no roles
    if (!userData || !userData.roles || userData.roles.length === 0) {
      console.log("No roles found for user, access denied");
      return (
        <Navigate 
          to="/unauthorized" 
          replace 
          state={{ requiredRoles }}
        />
      );
    }
    
    // Fix: Make sure we convert both sides to lowercase for comparison
    const hasRequiredRole = requiredRoles.some(requiredRole => 
      userData.roles.some(userRole => 
        userRole.toLowerCase() === requiredRole.toString().toLowerCase()
      )
    );
    
    console.log("Has required role:", hasRequiredRole);

    if (!hasRequiredRole) {
      // Redirect to unauthorized page with the required roles information
      return (
        <Navigate 
          to="/unauthorized" 
          replace 
          state={{ requiredRoles }}
        />
      );
    }
  }

  // If authenticated and has required role, render the outlet
  console.log("Access granted to path:", location.pathname);
  return <Outlet />;
};

export default ProtectedRoute;
