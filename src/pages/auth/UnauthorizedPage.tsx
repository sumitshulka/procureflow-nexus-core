
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();

  // Get required roles from state, if available
  const requiredRoles = location.state?.requiredRoles || [];
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500">
            You don't have permission to access this page.
          </p>
          
          {requiredRoles.length > 0 ? (
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
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
