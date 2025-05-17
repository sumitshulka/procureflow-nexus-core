
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import DataTable from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ApprovalActionMenu from '@/components/approval/ApprovalActionMenu';

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
}

const Approvals = () => {
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch approvals
  const { data: approvalRequests, isLoading, refetch } = useQuery({
    queryKey: ['approvals', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests_view')
        .select('*')
        .eq('status', activeTab);
      
      if (error) {
        console.error('Error fetching approvals:', error);
        throw new Error('Failed to fetch approvals');
      }
      
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
      cell: (row: ApprovalRequest) => <span>{row.request_title || 'Untitled'}</span>,
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
        
        switch (row.status) {
          case 'pending':
            badgeVariant = 'secondary';
            break;
          case 'approved':
            badgeVariant = 'success';
            break;
          case 'rejected':
            badgeVariant = 'destructive';
            break;
          case 'more_info':
            badgeVariant = 'warning';
            break;
        }
        
        return (
          <Badge variant={badgeVariant as any} className="capitalize">
            {row.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row: ApprovalRequest) => (
        <ApprovalActionMenu approval={row} onActionComplete={() => refetch()} />
      ),
    },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const renderDetailPanel = (row: ApprovalRequest) => {
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
          <div className="col-span-2">
            <p className="text-sm font-medium">Entity ID</p>
            <p className="text-sm break-all">{row.entity_id}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <ApprovalActionMenu approval={row} onActionComplete={() => refetch()} displayAsButtons />
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Approval Requests"
        description="Review and manage approval requests"
      />
      
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="more_info">Need Info</TabsTrigger>
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
