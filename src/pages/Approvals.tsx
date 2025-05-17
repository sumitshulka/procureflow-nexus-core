
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
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { ApprovalTimeline } from '@/components/approval';
import { useToast } from '@/components/ui/use-toast';

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
}

const Approvals = () => {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch approvals
  const { data: approvalRequests, isLoading, refetch } = useQuery({
    queryKey: ['approvals', activeTab],
    queryFn: async () => {
      console.log("Fetching approvals with status:", activeTab);
      
      let query = supabase
        .from('approval_requests_view')
        .select('*');
        
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching approvals:', error);
        throw new Error('Failed to fetch approvals');
      }
      
      console.log(`Found ${data?.length} approval requests with status ${activeTab}`, data);
      return data as ApprovalRequest[];
    }
  });

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
        return <span>{title}</span>;
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
      id: 'entity_status',
      header: 'Entity Status',
      cell: (row: ApprovalRequest) => (
        <Badge variant="outline" className="capitalize">
          {row.entity_status ? row.entity_status.replace('_', ' ') : 'N/A'}
        </Badge>
      ),
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
    
    // Fetch approval history
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
            profiles:requester_id(full_name)
          `)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        setApprovalHistory(data || []);
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
