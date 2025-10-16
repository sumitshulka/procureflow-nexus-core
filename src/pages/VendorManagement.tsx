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
import { useNavigate } from 'react-router-dom';
import { Search, Eye, CheckCircle, XCircle, Clock, MessageSquare, FileText, BarChart3, Package, FileImage, ShoppingCart, Phone, Building, Globe, Calendar, Filter, SortAsc, X } from 'lucide-react';
import VendorDetailDialog from '@/components/vendor/VendorDetailDialog';
import VendorCommunicationDialog from '@/components/vendor/VendorCommunicationDialog';
import VendorApprovalDialog from '@/components/vendor/VendorApprovalDialog';

const VendorManagement = () => {
  const { toast } = useToast();
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorRegistration[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorRegistration | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  
  // Advanced search states
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    productSearch: '',
    rfpDateFrom: '',
    rfpDateTo: '',
    poDateFrom: '',
    poDateTo: '',
    alphabetic: ''
  });

  const fetchVendors = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vendors:', error);
        throw error;
      }
      
      console.log('Vendors fetched successfully:', data);
      
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
      console.error('Failed to fetch vendors:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch vendors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ((hasRole(UserRole.ADMIN) || hasRole(UserRole.PROCUREMENT_OFFICER)) && user) {
      fetchVendors();
    }
  }, [hasRole, user]);

  useEffect(() => {
    let filtered = vendors;

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(vendor => vendor.status === activeTab);
    }

    // Filter by basic search term
    if (searchTerm) {
      filtered = filtered.filter(vendor =>
        vendor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.primary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.pan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.gst_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply advanced filters
    if (searchFilters.alphabetic) {
      filtered = filtered.filter(vendor =>
        vendor.company_name?.toLowerCase().startsWith(searchFilters.alphabetic.toLowerCase())
      );
    }

    // Sort alphabetically
    filtered.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));

    setFilteredVendors(filtered);
  }, [vendors, activeTab, searchTerm, searchFilters]);

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

  const clearAllFilters = () => {
    setSearchTerm('');
    setSearchFilters({
      productSearch: '',
      rfpDateFrom: '',
      rfpDateTo: '',
      poDateFrom: '',
      poDateTo: '',
      alphabetic: ''
    });
    setShowAdvancedSearch(false);
  };

  const alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
      all: vendors.length,
      approved: vendors.filter(v => v.status === 'approved').length,
      pending: vendors.filter(v => v.status === 'pending').length,
      under_review: vendors.filter(v => v.status === 'under_review').length,
      rejected: vendors.filter(v => v.status === 'rejected').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (!hasRole(UserRole.ADMIN) && !hasRole(UserRole.PROCUREMENT_OFFICER)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="py-8">
              <p className="text-gray-500">You don't have permission to access vendor management.</p>
            </div>
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

      {/* Enhanced Search */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, PAN, or GST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Advanced Search
          </Button>
          
          {(searchTerm || Object.values(searchFilters).some(v => v)) && (
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <Card className="p-4 bg-muted/30 animate-fade-in">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Advanced Search Filters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product/Service</label>
                  <Input
                    placeholder="Search by product name..."
                    value={searchFilters.productSearch}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, productSearch: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">RFP Date Range</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="date"
                      placeholder="From"
                      value={searchFilters.rfpDateFrom}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, rfpDateFrom: e.target.value }))}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={searchFilters.rfpDateTo}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, rfpDateTo: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">PO Date Range</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="date"
                      placeholder="From"
                      value={searchFilters.poDateFrom}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, poDateFrom: e.target.value }))}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={searchFilters.poDateTo}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, poDateTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Alphabetic Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <SortAsc className="w-4 h-4" />
            Quick Filter:
          </span>
          <Button
            variant={searchFilters.alphabetic === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchFilters(prev => ({ ...prev, alphabetic: '' }))}
          >
            All
          </Button>
          {alphabetLetters.map(letter => (
            <Button
              key={letter}
              variant={searchFilters.alphabetic === letter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchFilters(prev => ({ ...prev, alphabetic: letter }))}
              className="w-8 h-8 p-0"
            >
              {letter}
            </Button>
          ))}
        </div>
      </div>

      {/* Status Tabs - Reordered */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            Approved ({statusCounts.approved})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending ({statusCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="under_review" className="flex items-center gap-2">
            Under Review ({statusCounts.under_review})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            Rejected ({statusCounts.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span>Loading vendors...</span>
              </div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    {(searchTerm || Object.values(searchFilters).some(v => v)) 
                      ? "No vendors found matching your search criteria."
                      : "No vendors found for the selected status."}
                  </p>
                  {(searchTerm || Object.values(searchFilters).some(v => v)) && (
                    <Button variant="outline" onClick={clearAllFilters}>
                      Clear Search Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredVendors.map((vendor) => (
                <Card key={vendor.id} className="hover:shadow-lg transition-all duration-200 border-2 border-border/60 shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Main vendor information */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                              <h3 className="text-xl font-bold text-foreground">{vendor.company_name}</h3>
                              {getStatusBadge(vendor.status || 'pending')}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Building className="w-4 h-4" />
                              <span className="font-medium">Vendor #:</span>
                              <span className="font-mono">{vendor.vendor_number || 'Not Assigned'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Key Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Email:</span>
                            <span className="text-muted-foreground truncate">{vendor.primary_email}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Phone:</span>
                            <span className="text-muted-foreground">{vendor.primary_phone || '-'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Country:</span>
                            <span className="text-muted-foreground">{vendor.country || '-'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">PAN:</span>
                            <span className="text-muted-foreground font-mono">{vendor.pan_number || '-'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">GST:</span>
                            <span className="text-muted-foreground font-mono">{vendor.gst_number || '-'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Reg. Date:</span>
                            <span className="text-muted-foreground">
                              {vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Signatory Information */}
                        <div className="border-t pt-3 mb-4">
                          <div className="text-sm">
                            <span className="font-medium">Signatory:</span>
                            <span className="text-muted-foreground ml-2">
                              {vendor.signatory_name}
                              {vendor.signatory_designation && ` (${vendor.signatory_designation})`}
                            </span>
                          </div>
                        </div>

                        {/* Approval Comments */}
                        {vendor.approval_comments && (
                          <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-l-primary">
                            <span className="font-medium text-sm">
                              {vendor.status === 'rejected' ? 'Rejection Reason:' : 'Comments:'}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{vendor.approval_comments}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="border-t lg:border-t-0 lg:border-l bg-muted/20 p-6 lg:min-w-[280px]">
                        <div className="flex flex-col gap-3">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                          
                          {vendor.status === 'approved' && (
                            <Button
                              variant="default"
                              className="w-full justify-start"
                              onClick={() => navigate(`/vendor-dashboard/${vendor.id}`)}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Vendor Dashboard
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setShowCommunicationDialog(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send Message
                          </Button>
                          
                          {/* Status-specific actions */}
                          <div className="border-t pt-3 space-y-2">
                            {vendor.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => updateVendorStatus(vendor.id!, 'under_review')}
                                >
                                  Start Review
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApprovalAction(vendor, 'approve')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleApprovalAction(vendor, 'reject')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </>
                            )}

                            {vendor.status === 'under_review' && (
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApprovalAction(vendor, 'approve')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleApprovalAction(vendor, 'reject')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {vendor.status === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                                onClick={() => updateVendorStatus(vendor.id!, 'suspended')}
                              >
                                Suspend Vendor
                              </Button>
                            )}

                            {vendor.status === 'rejected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => updateVendorStatus(vendor.id!, 'pending')}
                              >
                                Reopen Application
                              </Button>
                            )}
                          </div>
                        </div>
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
