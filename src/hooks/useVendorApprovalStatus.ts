import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useVendorApprovalStatus = () => {
  const { user } = useAuth();

  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ["vendor_approval_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("status, company_name")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching vendor approval status:", error);
        throw error; // Let React Query handle the error instead of silently returning null
      }
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30s to pick up approval changes
    retry: 2,
  });

  // Use isPending (no data yet) instead of isLoading (isPending && isFetching)
  // This correctly treats disabled/unfetched queries as "loading" 
  // so the guard doesn't flash "Access Restricted" before data arrives
  const isLoading = isPending;

  return {
    vendorStatus: data?.status || null,
    companyName: data?.company_name || null,
    isApproved: data?.status === 'approved',
    isPending: data?.status === 'pending',
    isRejected: data?.status === 'rejected',
    isLoading,
    isError,
  };
};
