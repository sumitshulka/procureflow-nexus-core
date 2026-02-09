
import React from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useModulePermissions } from '@/hooks/useModulePermissions';

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
  const { user, userData, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is a vendor when vendor access is required
  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ["is_vendor_check", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id, status")
        .eq("user_id", user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const isVendor = !!vendorData;

  // Module permission helper (database-driven)
  const { hasModuleAccess, isLoading: permissionLoading } = useModulePermissions();

  // Show loading state - always wait for permissions to load for authenticated users
  if (isLoading || (user && vendorLoading) || (user && !requireVendor && permissionLoading)) {
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

  // For non-vendor routes, always check database permissions
  if (!requireVendor) {
    // Check if user has module access via database permissions
    if (!hasModuleAccess(location.pathname)) {
      // If user is a vendor, redirect them to vendor dashboard instead of blocking
      if (isVendor) {
        return <Navigate to="/vendor-dashboard" replace />;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have the required permissions to access this page.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => logout()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
