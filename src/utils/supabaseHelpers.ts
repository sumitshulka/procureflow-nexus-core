
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if the user is authenticated and returns user data
 * @returns The user object if authenticated, null otherwise
 */
export const checkAuthentication = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    toast({
      title: "Authentication required",
      description: "Please log in to continue",
      variant: "destructive",
    });
    return null;
  }
  
  return user;
};

/**
 * Logs a database error with appropriate error handling
 * @param error The error object
 * @param operation Description of the operation that failed
 */
export const logDatabaseError = (error: any, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  
  // Check for common error types
  if (error.code === "PGRST116") {
    toast({
      title: "Access denied",
      description: "You don't have permission to perform this action",
      variant: "destructive",
    });
  } else if (error.message?.includes("RLS")) {
    toast({
      title: "Access denied",
      description: "Row-level security policy violation",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Operation failed",
      description: `Failed to ${operation}: ${error.message || "Unknown error"}`,
      variant: "destructive",
    });
  }
};
