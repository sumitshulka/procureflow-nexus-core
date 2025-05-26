
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if the user is authenticated and returns user data
 * @returns The user object if authenticated, null otherwise
 */
export const checkAuthentication = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error("[supabaseHelpers] Authentication check failed:", error);
    toast({
      title: "Authentication required",
      description: "Please log in to continue",
      variant: "destructive",
    });
    return null;
  }
  
  console.info("[supabaseHelpers] User authenticated:", user.id);
  return user;
};

/**
 * Logs a database error with appropriate error handling
 * @param error The error object
 * @param operation Description of the operation that failed
 */
export const logDatabaseError = (error: any, operation: string) => {
  console.error(`[supabaseHelpers] Database error during ${operation}:`, error);
  console.error(`[supabaseHelpers] Error details:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    stack: error.stack
  });
  
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
  } else if (error.message?.includes("updated_at")) {
    console.error(`[supabaseHelpers] CRITICAL: updated_at field error in ${operation}:`, error);
    toast({
      title: "Database schema error",
      description: `Database field access error during ${operation}. Check logs for details.`,
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
