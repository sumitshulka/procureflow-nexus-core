import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useVendorApprovalStatus = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor_approval_status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("status, company_name")
        .eq("user_id", user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    vendorStatus: data?.status || null,
    companyName: data?.company_name || null,
    isApproved: data?.status === 'approved',
    isPending: data?.status === 'pending',
    isRejected: data?.status === 'rejected',
    isLoading,
  };
};
