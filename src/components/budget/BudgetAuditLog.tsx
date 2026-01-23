import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Filter, History, User, Calendar, ArrowUpDown } from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurrencySymbol } from "@/utils/currencyUtils";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user_id: string;
  details: any;
  user_name?: string;
  allocation_info?: {
    cycle_name?: string;
    head_name?: string;
    department_name?: string;
    period_number?: number;
    allocated_amount?: number;
    approved_amount?: number;
    status?: string;
  };
}

const BudgetAuditLog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch organization settings for currency
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings-budget-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('base_currency')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const currencySymbol = getCurrencySymbol(orgSettings?.base_currency || 'USD');

  // Fetch budget-related activity logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['budget-audit-logs'],
    queryFn: async () => {
      // Fetch activity logs related to budget entities
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .in('entity_type', ['budget_allocation', 'budget_cycle', 'budget_head'])
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user profiles for display names
      const userIds = [...new Set(logs?.map(l => l.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch allocation details for budget_allocation entries
      const allocationIds = logs
        ?.filter(l => l.entity_type === 'budget_allocation' && l.entity_id)
        .map(l => l.entity_id) || [];

      const { data: allocations } = await supabase
        .from('budget_allocations')
        .select(`
          id,
          period_number,
          allocated_amount,
          approved_amount,
          status,
          cycle:budget_cycles(name),
          head:budget_heads(name),
          department:departments(name)
        `)
        .in('id', allocationIds);

      const allocationMap = new Map(
        allocations?.map(a => [a.id, {
          cycle_name: a.cycle?.name,
          head_name: a.head?.name,
          department_name: a.department?.name,
          period_number: a.period_number,
          allocated_amount: a.allocated_amount,
          approved_amount: a.approved_amount,
          status: a.status
        }]) || []
      );

      return logs?.map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id) || 'Unknown User',
        allocation_info: allocationMap.get(log.entity_id || '')
      })) as AuditEntry[];
    }
  });

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'created': 'default',
      'submitted': 'default',
      'approved': 'default',
      'rejected': 'destructive',
      'updated': 'secondary',
      'revision_requested': 'outline',
      'revoked': 'outline'
    };

    const actionLabels: Record<string, string> = {
      'budget_submitted': 'Submitted',
      'budget_approved': 'Approved',
      'budget_rejected': 'Rejected',
      'budget_revision_requested': 'Revision Requested',
      'budget_created': 'Created',
      'budget_updated': 'Updated',
      'budget_revoked': 'Revoked',
      'cycle_created': 'Cycle Created',
      'cycle_updated': 'Cycle Updated',
      'head_created': 'Head Created',
      'head_updated': 'Head Updated'
    };

    const label = actionLabels[action] || action.replace(/_/g, ' ');
    const variant = action.includes('reject') ? 'destructive' 
      : action.includes('approv') ? 'default'
      : action.includes('revision') ? 'outline'
      : 'secondary';

    return <Badge variant={variant} className="capitalize">{label}</Badge>;
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      under_review: "outline",
      approved: "default",
      rejected: "destructive",
      revision_requested: "outline"
    };
    return <Badge variant={variants[status] || "default"} className="text-xs">{status.replace('_', ' ')}</Badge>;
  };

  // Filter logs
  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.allocation_info?.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.allocation_info?.head_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action.includes(actionFilter);
    const matchesStatus = statusFilter === "all" || log.allocation_info?.status === statusFilter;

    return matchesSearch && matchesAction && matchesStatus;
  }) || [];

  // Get unique actions for filter
  const uniqueActions = [...new Set(auditLogs?.map(l => l.action) || [])];

  const columns = [
    {
      id: 'created_at',
      header: 'Timestamp',
      cell: (row: AuditEntry) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}</span>
        </div>
      )
    },
    {
      id: 'user',
      header: 'User',
      cell: (row: AuditEntry) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{row.user_name}</span>
        </div>
      )
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: AuditEntry) => getActionBadge(row.action)
    },
    {
      id: 'entity',
      header: 'Budget Details',
      cell: (row: AuditEntry) => {
        if (row.entity_type === 'budget_allocation' && row.allocation_info) {
          return (
            <div className="space-y-1">
              <div className="font-medium text-sm">{row.allocation_info.head_name || 'Unknown Head'}</div>
              <div className="text-xs text-muted-foreground">
                {row.allocation_info.department_name} • {row.allocation_info.cycle_name} • P{row.allocation_info.period_number}
              </div>
            </div>
          );
        }
        return (
          <span className="text-muted-foreground capitalize">
            {row.entity_type?.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (row: AuditEntry) => {
        if (row.allocation_info?.allocated_amount) {
          return (
            <div className="text-right">
              <div className="font-medium">{currencySymbol}{row.allocation_info.allocated_amount.toLocaleString()}</div>
              {row.allocation_info.approved_amount && (
                <div className="text-xs text-muted-foreground">
                  Approved: {currencySymbol}{row.allocation_info.approved_amount.toLocaleString()}
                </div>
              )}
            </div>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      }
    },
    {
      id: 'status',
      header: 'Current Status',
      cell: (row: AuditEntry) => getStatusBadge(row.allocation_info?.status)
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <History className="h-6 w-6" />
          Budget Audit Log
        </h2>
        <p className="text-sm text-muted-foreground">
          Track all budget-related actions, changes, and approvals across the organization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actions</CardDescription>
            <CardTitle className="text-2xl">{auditLogs?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approvals</CardDescription>
            <CardTitle className="text-2xl text-primary">
              {auditLogs?.filter(l => l.action.includes('approved')).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejections</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {auditLogs?.filter(l => l.action.includes('rejected')).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revisions Requested</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {auditLogs?.filter(l => l.action.includes('revision')).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, department, or budget head..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="submitted">Submissions</SelectItem>
            <SelectItem value="approved">Approvals</SelectItem>
            <SelectItem value="rejected">Rejections</SelectItem>
            <SelectItem value="revision">Revisions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="revision_requested">Revision Requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        emptyMessage="No budget activity recorded yet"
      />
    </div>
  );
};

export default BudgetAuditLog;
