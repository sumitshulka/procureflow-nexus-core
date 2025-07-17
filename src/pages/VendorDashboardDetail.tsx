import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VendorRegistration, parseAddress } from '@/types/vendor';
import { useAuth } from '@/contexts/AuthContext';
import VendorProductsList from '@/components/vendor/VendorProductsList';
import { 
  ArrowLeft, 
  Building, 
  User, 
  FileText, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Phone,
  MapPin,
  CreditCard
} from 'lucide-react';

interface VendorStats {
  totalOrders: number;
  totalRevenue: number;
  activeProducts: number;
  rfpResponses: number;
  pendingInvoices: number;
  averageOrderValue: number;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'rfp' | 'product' | 'invoice';
  title: string;
  description: string;
  date: string;
  status: string;
  amount?: number;
}

const VendorDashboardDetail = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  
  const [vendor, setVendor] = useState<VendorRegistration | null>(null);
  const [stats, setStats] = useState<VendorStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeProducts: 0,
    rfpResponses: 0,
    pendingInvoices: 0,
    averageOrderValue: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
      fetchVendorStats();
      fetchRecentActivities();
    }
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error) throw error;

      const transformedData: VendorRegistration = {
        ...data,
        registered_address: parseAddress(data.registered_address),
        business_address: data.business_address ? parseAddress(data.business_address) : undefined,
        billing_address: data.billing_address ? parseAddress(data.billing_address) : undefined,
        status: data.status as any,
      };

      setVendor(transformedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vendor details',
        variant: 'destructive',
      });
    }
  };

  const fetchVendorStats = async () => {
    try {
      // Fetch purchase orders
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('total_amount, status')
        .eq('vendor_id', vendorId);

      if (ordersError) throw ordersError;

      // Fetch vendor products
      const { data: products, error: productsError } = await supabase
        .from('vendor_products')
        .select('id, is_active')
        .eq('vendor_id', vendorId);

      if (productsError) throw productsError;

      // Fetch RFP responses
      const { data: rfpResponses, error: rfpError } = await supabase
        .from('rfp_responses')
        .select('id, status')
        .eq('vendor_id', vendorId);

      if (rfpError) throw rfpError;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const activeProducts = products?.filter(p => p.is_active)?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalOrders,
        totalRevenue,
        activeProducts,
        rfpResponses: rfpResponses?.length || 0,
        pendingInvoices: orders?.filter(o => o.status === 'pending')?.length || 0,
        averageOrderValue
      });
    } catch (error: any) {
      console.error('Error fetching vendor stats:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      // This is a mock implementation - in a real app, you'd query from multiple tables
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          type: 'order',
          title: 'Purchase Order #PO-2025-0001',
          description: 'New purchase order received for office supplies',
          date: '2025-01-10',
          status: 'pending',
          amount: 25000
        },
        {
          id: '2',
          type: 'rfp',
          title: 'RFP Response Submitted',
          description: 'Response submitted for IT Equipment RFP',
          date: '2025-01-08',
          status: 'submitted'
        },
        {
          id: '3',
          type: 'product',
          title: 'Product Registered',
          description: 'New product "Premium Laptop" added to catalog',
          date: '2025-01-05',
          status: 'active'
        },
        {
          id: '4',
          type: 'invoice',
          title: 'Invoice Generated',
          description: 'Invoice #INV-2025-0012 generated',
          date: '2025-01-03',
          status: 'paid',
          amount: 15000
        }
      ];

      setRecentActivities(mockActivities);
    } catch (error: any) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return ShoppingCart;
      case 'rfp': return FileText;
      case 'product': return Package;
      case 'invoice': return DollarSign;
      default: return FileText;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary', icon: Clock },
      active: { variant: 'default', icon: CheckCircle },
      submitted: { variant: 'secondary', icon: Eye },
      paid: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading vendor dashboard...</span>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Vendor not found or you don't have permission to view this vendor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendors
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{vendor.company_name}</h1>
              <Badge variant={vendor.status === 'approved' ? 'default' : 'secondary'}>
                {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1).replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-gray-600">
              Vendor Number: <span className="font-medium">{vendor.vendor_number || 'Not Assigned'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{vendor.currency || 'USD'} {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold">{stats.activeProducts}</p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">RFP Responses</p>
                <p className="text-2xl font-bold">{stats.rfpResponses}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Order Value</p>
                <p className="text-2xl font-bold">{vendor.currency || 'USD'} {stats.averageOrderValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="rfps">RFPs</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest vendor activities and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Icon className="w-5 h-5 text-gray-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{activity.title}</h4>
                            {getStatusBadge(activity.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {activity.date}
                            </span>
                            {activity.amount && (
                              <span className="text-sm font-medium text-green-600">
                                {vendor.currency || 'USD'} {activity.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Information</CardTitle>
                <CardDescription>Key vendor details at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Primary Email</p>
                    <p className="font-medium">{vendor.primary_email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Primary Phone</p>
                    <p className="font-medium">{vendor.primary_phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{vendor.registered_address.city}, {vendor.registered_address.country}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Currency</p>
                    <p className="font-medium">{vendor.currency || 'USD'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Annual Turnover</p>
                    <p className="font-medium">
                      {vendor.annual_turnover 
                        ? `${vendor.currency || 'USD'} ${Number(vendor.annual_turnover).toLocaleString()}`
                        : 'Not specified'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Company Name:</span>
                  <p className="mt-1">{vendor.company_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Company Type:</span>
                  <p className="mt-1">{vendor.company_type || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">PAN Number:</span>
                  <p className="mt-1">{vendor.pan_number}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">GST Number:</span>
                  <p className="mt-1">{vendor.gst_number}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">TAN Number:</span>
                  <p className="mt-1">{vendor.tan_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Registration Number:</span>
                  <p className="mt-1">{vendor.registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Years in Business:</span>
                  <p className="mt-1">{vendor.years_in_business ? `${vendor.years_in_business} years` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Country:</span>
                  <p className="mt-1">{vendor.country || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Currency:</span>
                  <p className="mt-1">{vendor.currency || 'USD'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Annual Turnover:</span>
                  <p className="mt-1">
                    {vendor.annual_turnover 
                      ? `${vendor.currency || 'USD'} ${Number(vendor.annual_turnover).toLocaleString()}`
                      : 'Not specified'
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Incorporation Date:</span>
                  <p className="mt-1">
                    {vendor.incorporation_date 
                      ? new Date(vendor.incorporation_date).toLocaleDateString()
                      : 'Not provided'
                    }
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <span className="font-medium text-gray-600">Business Description:</span>
                  <p className="mt-1">{vendor.business_description || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Company Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium text-gray-600">Primary Email:</span>
                  <p className="mt-1">{vendor.primary_email}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Secondary Email:</span>
                  <p className="mt-1">{vendor.secondary_email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Primary Phone:</span>
                  <p className="mt-1">{vendor.primary_phone}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Secondary Phone:</span>
                  <p className="mt-1">{vendor.secondary_phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Website:</span>
                  <p className="mt-1">{vendor.website || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Authorized Signatory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="mt-1">{vendor.signatory_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Designation:</span>
                  <p className="mt-1">{vendor.signatory_designation || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Email:</span>
                  <p className="mt-1">{vendor.signatory_email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Phone:</span>
                  <p className="mt-1">{vendor.signatory_phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">PAN:</span>
                  <p className="mt-1">{vendor.signatory_pan || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Registered Address</h4>
                  <div className="text-sm text-gray-600">
                    <p>{vendor.registered_address.street}</p>
                    <p>{vendor.registered_address.city}, {vendor.registered_address.state}</p>
                    <p>{vendor.registered_address.postal_code}</p>
                    <p>{vendor.registered_address.country}</p>
                  </div>
                </div>
                
                {vendor.business_address && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Business Address</h4>
                    <div className="text-sm text-gray-600">
                      <p>{vendor.business_address.street}</p>
                      <p>{vendor.business_address.city}, {vendor.business_address.state}</p>
                      <p>{vendor.business_address.postal_code}</p>
                      <p>{vendor.business_address.country}</p>
                    </div>
                  </div>
                )}

                {vendor.billing_address && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Billing Address</h4>
                    <div className="text-sm text-gray-600">
                      <p>{vendor.billing_address.street}</p>
                      <p>{vendor.billing_address.city}, {vendor.billing_address.state}</p>
                      <p>{vendor.billing_address.postal_code}</p>
                      <p>{vendor.billing_address.country}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Bank Name:</span>
                  <p className="mt-1">{vendor.bank_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Branch:</span>
                  <p className="mt-1">{vendor.bank_branch || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Account Number:</span>
                  <p className="mt-1">{vendor.account_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">IFSC Code:</span>
                  <p className="mt-1">{vendor.ifsc_code || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-600">Account Holder Name:</span>
                  <p className="mt-1">{vendor.account_holder_name || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <VendorProductsList vendorId={vendorId!} />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>All purchase orders issued to this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Purchase order history will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfps">
          <Card>
            <CardHeader>
              <CardTitle>RFP Responses</CardTitle>
              <CardDescription>RFP responses submitted by this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">RFP response history will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Invoice history and payment status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Invoice management will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorDashboardDetail;