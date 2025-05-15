
import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-procurement-600">404</h1>
        <p className="text-2xl font-semibold text-gray-700 mt-4">Page not found</p>
        <p className="text-muted-foreground mt-2 max-w-md">
          The page you're looking for doesn't exist or has been moved to another
          location.
        </p>
        <Button asChild className="mt-8">
          <Link to="/" className="flex items-center">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
