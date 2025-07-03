import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  User, 
  FileText, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';
import { useNavigate } from 'react-router-dom';

const VendorDashboard = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  // Fetch vendor registration details
  const { data: vendorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["vendor_profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch vendor RFPs
  const { data: rfpData, isLoading: rfpLoading } = useQuery({
    queryKey: ["vendor_rfps", user?.id],
    queryFn: async () => {
      if (!user?.id) return { active: 0, responded: 0, pending: 0 };
      
      const { data, error } = await supabase
        .from("rfps")
        .select("id, title, status, deadline, created_at")
        .eq("status", "active");
      
      if (error) throw error;
      
      // Get responses for this vendor
      const { data: responses } = await supabase
        .from("rfp_responses")
        .select("rfp_id")
        .eq("vendor_id", user.id);
      
      const respondedRfpIds = responses?.map(r => r.rfp_id) || [];
      
      return {
        active: data?.length || 0,
        responded: respondedRfpIds.length,
        pending: (data?.length || 0) - respondedRfpIds.length,
        recent: data?.slice(0, 3) || [],
      };
    },
    enabled: !!user?.id,
  });

  // Fetch vendor purchase orders
  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ["vendor_purchase_orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, totalValue: 0, recent: [] };
      
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, vendor_registrations!inner(user_id)")
        .eq("vendor_registrations.user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const totalValue = data?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      
      return {
        total: data?.length || 0,
        totalValue,
        recent: data?.slice(0, 3) || [],
      };
    },
    enabled: !!user?.id,
  });

  // Fetch vendor messages (communications)
  const { data: messageCount } = useQuery({
    queryKey: ["vendor_messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from("vendor_communications")
        .select("*", { count: 'exact', head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const stats = [
    { 
      label: 'Active RFPs', 
      value: rfpData?.active?.toString() || '0', 
      icon: FileText, 
      color: 'bg-blue-500',
      description: `${rfpData?.pending || 0} pending responses`,
      href: '/vendor/rfps'
    },
    { 
      label: 'Purchase Orders', 
      value: poData?.total?.toString() || '0', 
      icon: ShoppingCart, 
      color: 'bg-green-500',
      description: `$${poData?.totalValue?.toLocaleString() || '0'} total value`,
      href: '/vendor/purchase-orders'
    },
    { 
      label: 'Products Listed', 
      value: '12', 
      icon: Package, 
      color: 'bg-orange-500',
      description: 'Catalog items',
      href: '/vendor/products'
    },
    { 
      label: 'Unread Messages', 
      value: messageCount?.toString() || '0', 
      icon: MessageSquare, 
      color: 'bg-purple-500',
      description: 'New communications',
      href: '/vendor/messages'
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = profileLoading || rfpLoading || poLoading;

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {userData?.fullName || 'Vendor'}</h1>
              <p className="text-blue-100 mt-1">
                {vendorProfile?.company_name || 'Your vendor account'} • Dashboard Overview
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Today</p>
              <p className="text-lg font-semibold">{format(new Date(), 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Message Alert for Unapproved Vendors */}
        {vendorProfile && vendorProfile.status !== 'approved' && messageCount > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-medium text-amber-800">New Message from Procurement Team</h3>
                    <p className="text-sm text-amber-700">
                      You have {messageCount} unread message{messageCount > 1 ? 's' : ''} regarding your vendor registration.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/vendor/messages')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  View Messages
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Vendor Profile Status
                </CardTitle>
                <CardDescription>Your registration and verification status</CardDescription>
              </div>
              {vendorProfile && getStatusBadge(vendorProfile.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{vendorProfile?.company_name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration Date</p>
                <p className="font-medium">
                  {vendorProfile?.created_at ? format(new Date(vendorProfile.created_at), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profile Completion</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={85} className="flex-1" />
                  <span className="text-sm font-medium">85%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(stat.href)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{isLoading ? '...' : stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent RFPs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent RFPs
              </CardTitle>
              <CardDescription>Latest request for proposals available to you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rfpData?.recent?.length ? (
                  rfpData.recent.map((rfp: any) => (
                    <div key={rfp.id} className="flex items-start gap-3 p-4 bg-accent rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{rfp.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Deadline: {format(new Date(rfp.deadline), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline">{rfp.status}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent RFPs available</p>
                  </div>
                )}
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/vendor/rfps')}>
                View All RFPs
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions & Financial Summary */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-bold">${poData?.totalValue?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-bold text-green-600">+12.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Outstanding</span>
                  <span className="font-bold">$0</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/vendor/finances')}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/vendor/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/vendor/rfps')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Browse RFPs
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/vendor/products')}>
                  <Package className="w-4 h-4 mr-2" />
                  Manage Products
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/vendor/messages')}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorDashboard;