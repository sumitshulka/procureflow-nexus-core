
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, user } = useAuth();

  const requiredRoles = location.state?.requiredRoles as UserRole[] || [];
  
  const debugRoles = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      toast({
        title: "Role Check Debug Information",
        description: (
          <div className="space-y-2 text-sm">
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Required Roles:</strong> {Array.isArray(requiredRoles) && requiredRoles.length > 0 
              ? requiredRoles.join(", ") 
              : "None"}</p>
            <p><strong>User Roles (from context):</strong> {userData?.roles?.length > 0 
              ? userData.roles.join(", ") 
              : "None"}</p>
            <p><strong>User Roles (direct from DB):</strong> {data?.length > 0 
              ? data.map(r => r.role).join(", ") 
              : "None"}</p>
          </div>
        ),
        duration: 10000,
      });
      
      console.log("Direct DB roles:", data);
      console.log("Required roles:", requiredRoles);
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Error fetching roles",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    console.log("Component mounted with state:", location.state);
    console.log("Required roles from state:", requiredRoles);
    console.log("User data:", userData);
    console.log("User roles:", userData?.roles);
  }, [location.state, requiredRoles, userData]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500">
            You don't have permission to access this page.
          </p>
          
          {Array.isArray(requiredRoles) && requiredRoles.length > 0 ? (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-left">
              <p className="text-sm font-medium text-gray-700">Required roles:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                {requiredRoles.map((role: string, index: number) => (
                  <li key={index}>{role}</li>
                ))}
              </ul>
              
              <p className="text-sm font-medium text-gray-700 mt-3">Your roles:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                {userData?.roles?.length ? (
                  userData.roles.map((role: string, index: number) => (
                    <li key={index}>{role}</li>
                  ))
                ) : (
                  <li>No roles assigned</li>
                )}
              </ul>

              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  User ID: {user?.id || "Not logged in"}
                </p>
                <p className="text-xs text-yellow-800">
                  Email: {user?.email || "No email"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2">
              This page requires specific roles that you don't currently have.
            </p>
          )}
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild>
            <Link to="/">
              Return to Dashboard
            </Link>
          </Button>
          <Button variant="secondary" onClick={debugRoles}>
            Debug Roles
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

