import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { getCurrencySymbol } from "@/utils/currencyUtils";

interface BudgetSubmissionsProps {
  isAdmin?: boolean;
}

const BudgetSubmissions = ({ isAdmin }: BudgetSubmissionsProps) => {
  const navigate = useNavigate();

  // Fetch organization settings for currency
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings-budget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('base_currency')
        .single();
      if (error) throw error;
      return data;
    }
  });

  const currencySymbol = getCurrencySymbol(orgSettings?.base_currency || 'USD');

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['budget-submissions', isAdmin],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(name, code),
          department:departments(name),
          submitter:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      // If not admin, filter by user's submissions
      if (!isAdmin) {
        query = query.eq('submitted_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: openCycles } = useQuery({
    queryKey: ['open-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_cycles')
        .select('*')
        .eq('status', 'open')
        .order('fiscal_year', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      under_review: "outline",
      approved: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPeriodLabel = (periodNumber: number, periodType: string) => {
    if (periodType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[periodNumber - 1];
    }
    return `Q${periodNumber}`;
  };

  const columns = [
    { 
      id: 'cycle', 
      header: 'Budget Cycle',
      cell: (row: any) => `${row.cycle?.name} (FY ${row.cycle?.fiscal_year})`
    },
    { 
      id: 'head', 
      header: 'Budget Head',
      cell: (row: any) => (
        <div>
          <div className="font-medium">{row.head?.name}</div>
          <div className="text-xs text-muted-foreground">{row.head?.code}</div>
        </div>
      )
    },
    { 
      id: 'period', 
      header: 'Period',
      cell: (row: any) => getPeriodLabel(row.period_number, row.cycle?.period_type)
    },
    ...(isAdmin ? [{
      id: 'department',
      header: 'Department',
      cell: (row: any) => row.department?.name || '-'
    }] : []),
    { 
      id: 'allocated_amount', 
      header: 'Requested Amount',
      cell: (row: any) => `${currencySymbol}${row.allocated_amount?.toLocaleString() || '0'}`
    },
    { 
      id: 'approved_amount', 
      header: 'Approved Amount',
      cell: (row: any) => row.approved_amount ? `${currencySymbol}${row.approved_amount.toLocaleString()}` : '-'
    },
    { 
      id: 'status', 
      header: 'Status',
      cell: (row: any) => getStatusBadge(row.status)
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Budget Submissions</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Review all department budget submissions" : "Submit and track your department budgets"}
          </p>
        </div>
        {!isAdmin && openCycles && openCycles.length > 0 && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Budget
          </Button>
        )}
      </div>

      {!isAdmin && (!openCycles || openCycles.length === 0) && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No open budget cycles available for submission
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={submissions || []}
        emptyMessage={
          isAdmin 
            ? "No budget submissions yet" 
            : "You haven't submitted any budgets yet"
        }
      />
    </div>
  );
};

export default BudgetSubmissions;