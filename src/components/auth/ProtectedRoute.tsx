
import React from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requireVendor?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  allowedRoles,
  requireVendor = false
}) => {
  const { user, userData, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is a vendor when vendor access is required
  const { data: isVendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["is_vendor", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      return !error && !!data;
    },
    enabled: !!user?.id && requireVendor,
  });

  // Check if user has permission to access the current route based on role_permissions
  const { data: hasModuleAccess, isLoading: permissionLoading } = useQuery({
    queryKey: ["module_access", user?.id, location.pathname],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // First get the user's role IDs
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id);
      
      if (rolesError || !userRoles?.length) {
        console.log("No roles found for user");
        return false;
      }
      
      const roleIds = userRoles.map(r => r.role_id);
      
      // Check if any of user's roles is Admin (case-insensitive)
      const { data: adminRoles } = await supabase
        .from("custom_roles")
        .select("id, name")
        .in("id", roleIds);
      
      const isAdmin = adminRoles?.some(role => role.name.toLowerCase() === 'admin');
      
      // Admin role has access to everything
      if (isAdmin) {
        return true;
      }
      
      // For non-admin users, check if they have permission for the current route
      const currentPath = location.pathname;
      
      // Find system module that matches this route
      const { data: matchingModules } = await supabase
        .from("system_modules")
        .select("id, menu_item_id, menu_items!menu_item_id(route_path)")
        .eq("is_active", true);
      
      // Find module that matches the current path
      const matchedModule = matchingModules?.find((mod: any) => {
        const routePath = mod.menu_items?.route_path;
        if (!routePath) return false;
        return currentPath === routePath || currentPath.startsWith(routePath + '/');
      });
      
      if (!matchedModule) {
        // If no module found for this route, check if it's a general route that should be accessible
        // Allow access to documentation and similar pages
        if (currentPath.startsWith('/documentation')) {
          return true;
        }
        // For unregistered routes, deny by default if role is required
        return false;
      }
      
      // Check if any of user's roles has permission for this module
      const { data: permission } = await supabase
        .from("role_permissions")
        .select("permission")
        .in("role_id", roleIds)
        .eq("module_uuid", matchedModule.id)
        .limit(1)
        .single();
      
      return !!permission;
    },
    enabled: !!user?.id && !requireVendor && (!!requiredRole || !!allowedRoles),
  });

  // Show loading state
  if (isLoading || (requireVendor && vendorLoading) || ((requiredRole || allowedRoles) && permissionLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check vendor access if required
  if (requireVendor && !isVendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            This area is restricted to registered vendors only.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2"
          >
            Back to Login
          </button>
          <button
            onClick={() => navigate('/vendor-registration')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Register as Vendor
          </button>
        </div>
      </div>
    );
  }

  // Check role/permission if required (for non-vendor routes)
  if ((requiredRole || allowedRoles) && !requireVendor) {
    // First check userData.roles for backward compatibility with hardcoded role names
    const userRolesLower = userData?.roles?.map(r => r.toLowerCase()) || [];
    
    const hasRequiredRole = requiredRole 
      ? userRolesLower.includes(requiredRole.toLowerCase())
      : allowedRoles 
        ? allowedRoles.some(role => userRolesLower.includes(role.toLowerCase()))
        : true;

    // If user has the role by name OR has module access via permissions, allow access
    if (!hasRequiredRole && !hasModuleAccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have the required permissions to access this page.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
