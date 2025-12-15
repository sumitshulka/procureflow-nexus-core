import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import DataTable from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ApprovalActionMenu from '@/components/approval/ApprovalActionMenu';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Loader2, Eye } from 'lucide-react';
import { ApprovalTimeline } from '@/components/approval';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrencySymbol } from '@/utils/currencyUtils';

interface ApprovalRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  requester_id: string;
  requester_name: string;
  created_at: string;
  request_title: string;
  entity_status: string;
  comments?: string;
  approval_date?: string;
  approver_id?: string;
  // Additional enriched fields
  amount?: number;
  currency?: string;
  vendor_name?: string;
}

const Approvals = () => {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch approvals and enrich with additional data
  const { data: approvalRequests, isLoading, refetch } = useQuery({
    queryKey: ['approvals', activeTab],
    queryFn: async () => {
      console.log("Fetching approvals with status:", activeTab);
      
      let query = supabase.rpc('get_approval_requests_secure');
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching approvals:', error);
        throw new Error('Failed to fetch approvals');
      }
      
      const filteredData = (data || []).filter(item => 
        activeTab === 'all' || item.status === activeTab
      ) as ApprovalRequest[];
      
      // Enrich with amount and vendor data
      const enrichedData = await enrichApprovalData(filteredData);
      
      console.log(`Found ${enrichedData?.length} approval requests with status ${activeTab}`, enrichedData);
      return enrichedData;
    }
  });

  // Function to fetch additional details for approvals
  const enrichApprovalData = async (approvals: ApprovalRequest[]): Promise<ApprovalRequest[]> => {
    if (!approvals || approvals.length === 0) return approvals;

    // Group by entity type for batch fetching
    const invoiceIds = approvals.filter(a => a.entity_type === 'invoice').map(a => a.entity_id);
    const poIds = approvals.filter(a => a.entity_type === 'purchase_order').map(a => a.entity_id);
    const prIds = approvals.filter(a => a.entity_type === 'procurement_request').map(a => a.entity_id);

    // Fetch invoice details
    let invoiceMap: Record<string, { amount: number; currency: string; vendor_name: string }> = {};
    if (invoiceIds.length > 0) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, currency, vendor_id')
        .in('id', invoiceIds);
      
      if (invoices && invoices.length > 0) {
        const vendorIds = invoices.map(i => i.vendor_id).filter(Boolean);
        const { data: vendors } = await supabase
          .from('vendor_registrations')
          .select('id, company_name')
          .in('id', vendorIds);
        
        const vendorMap = (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.company_name }), {});
        
        invoiceMap = (invoices || []).reduce((acc, inv) => ({
          ...acc,
          [inv.id]: {
            amount: inv.total_amount,
            currency: inv.currency || 'USD',
            vendor_name: vendorMap[inv.vendor_id] || 'Unknown'
          }
        }), {});
      }
    }

    // Fetch PO details
    let poMap: Record<string, { amount: number; currency: string; vendor_name: string }> = {};
    if (poIds.length > 0) {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, final_amount, currency, vendor_id')
        .in('id', poIds);
      
      if (pos && pos.length > 0) {
        const vendorIds = pos.map(p => p.vendor_id).filter(Boolean);
        const { data: vendors } = await supabase
          .from('vendor_registrations')
          .select('id, company_name')
          .in('id', vendorIds);
        
        const vendorMap = (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.company_name }), {});
        
        poMap = (pos || []).reduce((acc, po) => ({
          ...acc,
          [po.id]: {
            amount: po.final_amount,
            currency: po.currency || 'USD',
            vendor_name: vendorMap[po.vendor_id] || 'Unknown'
          }
        }), {});
      }
    }

    // Fetch procurement request details
    let prMap: Record<string, { amount: number }> = {};
    if (prIds.length > 0) {
      const { data: prs } = await supabase
        .from('procurement_requests')
        .select('id, estimated_value')
        .in('id', prIds);
      
      prMap = (prs || []).reduce((acc, pr) => ({
        ...acc,
        [pr.id]: { amount: pr.estimated_value }
      }), {});
    }

    // Enrich approvals with fetched data
    return approvals.map(approval => {
      if (approval.entity_type === 'invoice' && invoiceMap[approval.entity_id]) {
        return { ...approval, ...invoiceMap[approval.entity_id] };
      }
      if (approval.entity_type === 'purchase_order' && poMap[approval.entity_id]) {
        return { ...approval, ...poMap[approval.entity_id] };
      }
      if (approval.entity_type === 'procurement_request' && prMap[approval.entity_id]) {
        return { ...approval, amount: prMap[approval.entity_id].amount };
      }
      return approval;
    });
  };

  // Get navigation path for quick view based on entity type
  const getQuickViewPath = (row: ApprovalRequest): string | null => {
    switch (row.entity_type) {
      case 'invoice':
        return `/invoices/${row.entity_id}`;
      case 'purchase_order':
        return `/purchase-orders/${row.entity_id}`;
      case 'procurement_request':
        return `/procurement-requests/${row.entity_id}`;
      default:
        return null;
    }
  };

  const columns = [
    {
      id: 'request_type',
      header: 'Type',
      cell: (row: ApprovalRequest) => (
        <Badge variant="outline" className="capitalize">
          {row.entity_type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'title',
      header: 'Title',
      cell: (row: ApprovalRequest) => {
        // Extract title from comments if it exists (used for inventory checkout)
        const titleMatch = row.comments?.match(/Title: (.*)/);
        const title = titleMatch ? titleMatch[1] : (row.request_title || 'Untitled');
        return <span className="font-medium">{title}</span>;
      },
    },
    {
      id: 'vendor',
      header: 'Vendor',
      cell: (row: ApprovalRequest) => (
        <span className="text-muted-foreground">
          {row.vendor_name || '-'}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (row: ApprovalRequest) => {
        if (row.amount == null) return <span className="text-muted-foreground">-</span>;
        const symbol = getCurrencySymbol(row.currency || 'USD');
        return (
          <span className="font-medium">
            {symbol}{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: 'requester',
      header: 'Requester',
      cell: (row: ApprovalRequest) => <span>{row.requester_name || 'Unknown'}</span>,
    },
    {
      id: 'date',
      header: 'Submitted',
      cell: (row: ApprovalRequest) => (
        <span>{row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : 'N/A'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: ApprovalRequest) => {
        let badgeVariant = 'default';
        let icon = null;
        
        switch (row.status) {
          case 'pending':
            badgeVariant = 'secondary';
            icon = <AlertCircle className="mr-1 h-3 w-3" />;
            break;
          case 'approved':
            badgeVariant = 'success';
            icon = <CheckCircle className="mr-1 h-3 w-3" />;
            break;
          case 'rejected':
            badgeVariant = 'destructive';
            icon = <XCircle className="mr-1 h-3 w-3" />;
            break;
          case 'more_info':
            badgeVariant = 'warning';
            icon = <AlertTriangle className="mr-1 h-3 w-3" />;
            break;
        }
        
        return (
          <Badge variant={badgeVariant as any} className="capitalize flex items-center">
            {icon}
            {row.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row: ApprovalRequest) => (
        <ApprovalActionMenu 
          approval={row} 
          onActionComplete={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] });
          }}
          onQuickView={getQuickViewPath(row) ? () => navigate(getQuickViewPath(row)!) : undefined}
        />
      ),
    },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
  };
  
  // Component for showing approval details
  const ApprovalDetail = ({ 
    entityType, 
    entityId, 
    row, 
    onActionComplete 
  }: { 
    entityType: string, 
    entityId: string, 
    row: ApprovalRequest, 
    onActionComplete: () => void 
  }) => {
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Fetch approval history using the same pattern as ApprovalWorkflow
    const fetchApprovalHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('approvals')
          .select(`
            id,
            status,
            created_at,
            approval_date,
            comments,
            requester_id
          `)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        // If we have approvals, fetch the profile data separately to avoid join issues
        if (data && data.length > 0) {
          const requesterIds = [...new Set(data.map(approval => approval.requester_id))];
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', requesterIds);
            
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            // Continue without profile names if profiles fetch fails
            setApprovalHistory(data.map(approval => ({
              ...approval,
              profiles: { full_name: 'Unknown user' }
            })));
            return;
          }
          
          // Map profile data to approvals
          const enrichedData = data.map(approval => {
            const profile = profiles?.find(p => p.id === approval.requester_id);
            return {
              ...approval,
              profiles: { full_name: profile?.full_name || 'Unknown user' }
            };
          });
          
          setApprovalHistory(enrichedData);
        } else {
          setApprovalHistory(data || []);
        }
      } catch (error) {
        console.error('Error fetching approval history:', error);
        toast({
          title: "Error",
          description: "Failed to fetch approval history",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    useEffect(() => {
      fetchApprovalHistory();
    }, [entityType, entityId]);
    
    // Extract title from comments if it exists
    const titleMatch = row.comments?.match(/Title: (.*)/);
    const title = titleMatch ? titleMatch[1] : row.request_title;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Request Type</p>
            <p className="text-sm">{row.entity_type.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-sm capitalize">{row.status.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Requester</p>
            <p className="text-sm">{row.requester_name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Submitted</p>
            <p className="text-sm">{row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy hh:mm a') : 'N/A'}</p>
          </div>
          {row.approval_date && (
            <div>
              <p className="text-sm font-medium">Decision Date</p>
              <p className="text-sm">{format(new Date(row.approval_date), 'MMM dd, yyyy hh:mm a')}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-sm font-medium">Entity ID</p>
            <p className="text-sm break-all">{row.entity_id}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium">Title</p>
            <p className="text-sm">{title || 'No title'}</p>
          </div>
          {row.comments && !row.comments.startsWith('Title:') && (
            <div className="col-span-2">
              <p className="text-sm font-medium">Comments</p>
              <p className="text-sm whitespace-pre-wrap">{row.comments}</p>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <h3 className="font-medium text-sm mb-2">Approval History</h3>
          <ApprovalTimeline 
            approvalHistory={approvalHistory} 
            loading={loading} 
          />
        </div>
        
        <div className="mt-4">
          <ApprovalActionMenu 
            approval={row} 
            onActionComplete={() => {
              onActionComplete();
              fetchApprovalHistory();
            }} 
            displayAsButtons 
          />
        </div>
      </div>
    );
  };

  // Render detail panel that returns JSX directly
  const renderDetailPanel = (row: ApprovalRequest) => {
    return (
      <ApprovalDetail 
        entityType={row.entity_type} 
        entityId={row.entity_id} 
        row={row} 
        onActionComplete={handleRefresh} 
      />
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Approval Requests"
        description="Review and manage approval requests"
        actions={
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        }
      />
      
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="more_info">Need Info</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <DataTable
              columns={columns}
              data={approvalRequests || []}
              loading={isLoading}
              emptyMessage={`No ${activeTab} approval requests found`}
              showDetailPanel={renderDetailPanel}
              detailPanelTitle="Request Details"
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Approvals;
