
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

const ApprovalMenuItem = () => {
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) {
        console.error('Error fetching pending approvals count:', error);
        return 0;
      }
      
      return count || 0;
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  return (
    <NavLink
      to="/approvals"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )
      }
    >
      <ClipboardCheck className="h-4 w-4" />
      <span>Approvals</span>
      {pendingCount && pendingCount > 0 && (
        <Badge variant="secondary" className="ml-auto text-xs">
          {pendingCount}
        </Badge>
      )}
    </NavLink>
  );
};

export default ApprovalMenuItem;
