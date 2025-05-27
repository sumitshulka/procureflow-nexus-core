
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VendorRegistration, VendorCommunication, Address } from '@/types/vendor';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Building, MessageSquare, FileText, ShoppingCart, DollarSign, Package } from 'lucide-react';

const VendorPortal = () => {
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const [vendorData, setVendorData] = useState<VendorRegistration | null>(null);
  const [communications, setCommunications] = useState<VendorCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasRole(UserRole.VENDOR)) {
      fetchVendorData();
    }
  }, [hasRole, user]);

  useEffect(() => {
    if (vendorData?.id) {
      fetchCommunications();
    }
  }, [vendorData]);

  const fetchVendorData = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: VendorRegistration = {
        ...data,
        registered_address: typeof data.registered_address === 'string' 
          ? JSON.parse(data.registered_address) 
          : data.registered_address as Address,
        business_address: data.business_address 
          ? (typeof data.business_address === 'string' 
              ? JSON.parse(data.business_address) 
              : data.business_address as Address)
          : undefined,
        billing_address: data.billing_address 
          ? (typeof data.billing_address === 'string' 
              ? JSON.parse(data.billing_address) 
              : data.billing_address as Address)
          : undefined,
      };
      
      setVendorData(transformedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vendor data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommunications = async () => {
    if (!vendorData?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('vendor_communications')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: VendorCommunication[] = (data || []).map(item => ({
        ...item,
        sender_type: item.sender_type as 'admin' | 'vendor',
        attachments: item.attachments ? (Array.isArray(item.attachments) ? item.attachments : []) : undefined,
      }));
      
      setCommunications(transformedData);
    } catch (error: any) {
      console.error('Error fetching communications:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review' },
      under_review: { color: 'bg-blue-100 text-blue-800', text: 'Under Review' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      suspended: { color: 'bg-gray-100 text-gray-800', text: 'Suspended' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (!hasRole(UserRole.VENDOR)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Access denied. This portal is for approved vendors only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading vendor portal...</p>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">No vendor registration found. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Portal</h1>
          <p className="text-gray-600">Welcome, {vendorData.company_name}</p>
        </div>
        {getStatusBadge(vendorData.status || 'pending')}
      </div>

      {/* Status Banner */}
      {vendorData.status === 'pending' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Registration Under Review</h3>
                <p className="text-sm text-yellow-700">
                  Your vendor registration is currently being reviewed. You will be notified once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {vendorData.status === 'rejected' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Registration Rejected</h3>
                <p className="text-sm text-red-700">
                  Your vendor registration has been rejected. Please check messages for more details or contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold">
                  {vendorData.status?.charAt(0).toUpperCase() + vendorData.status?.slice(1).replace('_', ' ')}
                </p>
              </div>
              <Building className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold">{communications.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">RFPs</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="rfps">RFPs</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Your registered company information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Company Name:</span>
                <p>{vendorData.company_name}</p>
              </div>
              <div>
                <span className="font-medium">Primary Email:</span>
                <p>{vendorData.primary_email}</p>
              </div>
              <div>
                <span className="font-medium">Phone:</span>
                <p>{vendorData.primary_phone}</p>
              </div>
              <div>
                <span className="font-medium">GST Number:</span>
                <p>{vendorData.gst_number}</p>
              </div>
              <div>
                <span className="font-medium">PAN Number:</span>
                <p>{vendorData.pan_number}</p>
              </div>
              <div>
                <span className="font-medium">Signatory:</span>
                <p>{vendorData.signatory_name}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Associations
              </CardTitle>
              <CardDescription>Products you are approved to supply</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                No product associations yet. This will be available after your vendor registration is approved.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfps">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Request for Proposals (RFPs)
              </CardTitle>
              <CardDescription>RFPs you can participate in</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                No RFPs available. This feature will be available after approval and product association setup.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Purchase Orders
              </CardTitle>
              <CardDescription>Your purchase orders and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                No purchase orders yet. This will be available after receiving orders.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Communication Logs
              </CardTitle>
              <CardDescription>Messages from procurement team</CardDescription>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No messages yet</p>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{comm.subject}</h4>
                        <Badge variant="outline">
                          {comm.sender_type === 'admin' ? 'From Admin' : 'From You'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{comm.message}</p>
                      <p className="text-xs text-gray-400">
                        {comm.created_at ? new Date(comm.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorPortal;
