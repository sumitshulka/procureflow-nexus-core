import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VendorRegistration, parseAddress } from '@/types/vendor';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Eye, CheckCircle, XCircle, Clock, MessageSquare, FileText } from 'lucide-react';
import VendorDetailDialog from '@/components/vendor/VendorDetailDialog';
import VendorCommunicationDialog from '@/components/vendor/VendorCommunicationDialog';
import VendorApprovalDialog from '@/components/vendor/VendorApprovalDialog';

const VendorManagement = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const [vendors, setVendors] = useState<VendorRegistration[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedVendor, setSelectedVendor] = useState<VendorRegistration | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: VendorRegistration[] = (data || []).map(item => ({
        ...item,
        registered_address: parseAddress(item.registered_address),
        business_address: item.business_address ? parseAddress(item.business_address) : undefined,
        billing_address: item.billing_address ? parseAddress(item.billing_address) : undefined,
        status: item.status as any, // Cast to avoid type issues
      }));
      
      setVendors(transformedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vendors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole(UserRole.ADMIN) || hasRole(UserRole.PROCUREMENT_OFFICER)) {
      fetchVendors();
    }
  }, [hasRole]);

  useEffect(() => {
    let filtered = vendors;

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(vendor => vendor.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(vendor =>
        vendor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.primary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.pan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.gst_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredVendors(filtered);
  }, [vendors, activeTab, searchTerm]);

  const updateVendorStatus = async (vendorId: string, status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended', comments?: string) => {
    try {
      const { error } = await supabase
        .from('vendor_registrations')
        .update({
          status,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          approval_comments: comments,
        })
        .eq('id', vendorId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Vendor status updated to ${status}`,
      });

      fetchVendors();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update vendor status',
        variant: 'destructive',
      });
    }
  };

  const handleApprovalAction = (vendor: VendorRegistration, action: 'approve' | 'reject') => {
    setSelectedVendor(vendor);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const handleApprove = (vendorId: string, comments?: string) => {
    updateVendorStatus(vendorId, 'approved', comments);
  };

  const handleReject = (vendorId: string, reason: string) => {
    updateVendorStatus(vendorId, 'rejected', reason);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusCounts = () => {
    return {
      pending: vendors.filter(v => v.status === 'pending').length,
      under_review: vendors.filter(v => v.status === 'under_review').length,
      approved: vendors.filter(v => v.status === 'approved').length,
      rejected: vendors.filter(v => v.status === 'rejected').length,
      all: vendors.length,
    };
  };

  const statusCounts = getStatusCounts();

  if (!hasRole(UserRole.ADMIN) && !hasRole(UserRole.PROCUREMENT_OFFICER)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">You don't have permission to access vendor management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600">Review and manage vendor registrations</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search vendors by name, email, PAN, or GST..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending ({statusCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="under_review" className="flex items-center gap-2">
            Under Review ({statusCounts.under_review})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            Approved ({statusCounts.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            Rejected ({statusCounts.rejected})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All ({statusCounts.all})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading vendors...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-gray-500">No vendors found for the selected criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredVendors.map((vendor) => (
                <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{vendor.company_name}</h3>
                          {getStatusBadge(vendor.status || 'pending')}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Email:</span> {vendor.primary_email}
                          </div>
                          <div>
                            <span className="font-medium">PAN:</span> {vendor.pan_number}
                          </div>
                          <div>
                            <span className="font-medium">GST:</span> {vendor.gst_number}
                          </div>
                          <div>
                            <span className="font-medium">Country:</span> {vendor.country || '-'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                          <div>
                            <span className="font-medium">Currency:</span> {vendor.currency || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Annual Turnover:</span> {vendor.annual_turnover ? `${vendor.currency || 'USD'} ${Number(vendor.annual_turnover).toLocaleString()}` : '-'}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Signatory:</span> {vendor.signatory_name}
                          {vendor.signatory_designation && ` (${vendor.signatory_designation})`}
                        </div>
                        
                        {vendor.business_description && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Business:</span> {vendor.business_description}
                          </div>
                        )}

                        {vendor.approval_comments && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-md">
                            <span className="font-medium text-sm">
                              {vendor.status === 'rejected' ? 'Rejection Reason:' : 'Comments:'}
                            </span>
                            <p className="text-sm text-gray-700 mt-1">{vendor.approval_comments}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowCommunicationDialog(true);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                        
                        {vendor.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateVendorStatus(vendor.id!, 'under_review')}
                            >
                              Review
                            </Button>
                            <Button
                              variant="approve"
                              size="sm"
                              onClick={() => handleApprovalAction(vendor, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="reject"
                              size="sm"
                              onClick={() => handleApprovalAction(vendor, 'reject')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {vendor.status === 'under_review' && (
                          <>
                            <Button
                              variant="approve"
                              size="sm"
                              onClick={() => handleApprovalAction(vendor, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="reject"
                              size="sm"
                              onClick={() => handleApprovalAction(vendor, 'reject')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {vendor.status === 'approved' && (
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => updateVendorStatus(vendor.id!, 'suspended')}
                          >
                            Suspend
                          </Button>
                        )}

                        {vendor.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateVendorStatus(vendor.id!, 'pending')}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedVendor && (
        <>
          <VendorDetailDialog
            vendor={selectedVendor}
            isOpen={showDetailDialog}
            onClose={() => {
              setShowDetailDialog(false);
              setSelectedVendor(null);
            }}
            onStatusUpdate={updateVendorStatus}
          />
          
          <VendorCommunicationDialog
            vendor={selectedVendor}
            isOpen={showCommunicationDialog}
            onClose={() => {
              setShowCommunicationDialog(false);
              setSelectedVendor(null);
            }}
          />

          <VendorApprovalDialog
            vendor={selectedVendor}
            isOpen={showApprovalDialog}
            onClose={() => {
              setShowApprovalDialog(false);
              setSelectedVendor(null);
              setApprovalAction(null);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
            action={approvalAction}
          />
        </>
      )}
    </div>
  );
};

export default VendorManagement;
