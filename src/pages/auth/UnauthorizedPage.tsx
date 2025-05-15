
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const UnauthorizedPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500">
            You don't have permission to access this page.
          </p>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
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
