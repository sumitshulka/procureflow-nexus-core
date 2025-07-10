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

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Profile</CardTitle>
              <CardDescription>Complete vendor registration information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Company Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Company Name:</span> {vendor.company_name}</div>
                    <div><span className="font-medium">Company Type:</span> {vendor.company_type || '-'}</div>
                    <div><span className="font-medium">PAN Number:</span> {vendor.pan_number}</div>
                    <div><span className="font-medium">GST Number:</span> {vendor.gst_number}</div>
                    <div><span className="font-medium">Registration Number:</span> {vendor.registration_number || '-'}</div>
                    <div><span className="font-medium">Years in Business:</span> {vendor.years_in_business || '-'}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Primary Email:</span> {vendor.primary_email}</div>
                    <div><span className="font-medium">Secondary Email:</span> {vendor.secondary_email || '-'}</div>
                    <div><span className="font-medium">Primary Phone:</span> {vendor.primary_phone}</div>
                    <div><span className="font-medium">Secondary Phone:</span> {vendor.secondary_phone || '-'}</div>
                    <div><span className="font-medium">Website:</span> {vendor.website || '-'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Products</CardTitle>
              <CardDescription>Products offered by this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Product management functionality will be implemented here.</p>
            </CardContent>
          </Card>
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