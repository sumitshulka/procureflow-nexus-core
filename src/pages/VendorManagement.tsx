
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VendorRegistration } from '@/types/vendor';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Eye, CheckCircle, XCircle, Clock, MessageSquare, FileText } from 'lucide-react';
import VendorDetailDialog from '@/components/vendor/VendorDetailDialog';
import VendorCommunicationDialog from '@/components/vendor/VendorCommunicationDialog';

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

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_registration_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
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
    if (hasRole('admin') || hasRole('procurement_officer')) {
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

  const updateVendorStatus = async (vendorId: string, status: string, comments?: string) => {
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

  if (!hasRole('admin') && !hasRole('procurement_officer')) {
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Email:</span> {vendor.primary_email}
                          </div>
                          <div>
                            <span className="font-medium">PAN:</span> {vendor.pan_number}
                          </div>
                          <div>
                            <span className="font-medium">GST:</span> {vendor.gst_number}
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
                              onClick={() => updateVendorStatus(vendor.id!, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="reject"
                              size="sm"
                              onClick={() => updateVendorStatus(vendor.id!, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
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
        </>
      )}
    </div>
  );
};

export default VendorManagement;
