import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  CreditCard,
  FileText,
  Download,
  Eye,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VendorFinances = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('12m');

  // Fetch financial data
  const { data: financialData, isLoading } = useQuery({
    queryKey: ["vendor_finances", user?.id, timeframe],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get vendor registration
      const { data: vendorReg, error: vendorError } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (vendorError) throw vendorError;
      if (!vendorReg) return null;
      
      // Get purchase orders with payment information
      const { data: purchaseOrders, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("vendor_id", vendorReg.id)
        .order("po_date", { ascending: false });
      
      if (poError) throw poError;
      
      // Calculate financial metrics
      const totalRevenue = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      const completedOrders = purchaseOrders?.filter(po => po.status === 'completed') || [];
      const paidAmount = completedOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
      const pendingAmount = purchaseOrders?.filter(po => ['sent', 'acknowledged', 'in_progress', 'delivered'].includes(po.status))
        .reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      
      // Generate monthly revenue data (mock data for demonstration)
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthOrders = purchaseOrders?.filter(po => {
          const poDate = new Date(po.po_date);
          return poDate.getMonth() === date.getMonth() && poDate.getFullYear() === date.getFullYear();
        }) || [];
        
        monthlyData.push({
          month: format(date, 'MMM'),
          revenue: monthOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0),
          orders: monthOrders.length,
        });
      }
      
      return {
        totalRevenue,
        paidAmount,
        pendingAmount,
        outstandingAmount: totalRevenue - paidAmount,
        totalOrders: purchaseOrders?.length || 0,
        completedOrders: completedOrders.length,
        monthlyData,
        recentTransactions: purchaseOrders?.slice(0, 10) || [],
      };
    },
    enabled: !!user?.id,
  });

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'in_progress':
      case 'acknowledged':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unpaid</Badge>;
    }
  };

  const calculateGrowth = () => {
    if (!financialData?.monthlyData || financialData.monthlyData.length < 2) return 0;
    const lastMonth = financialData.monthlyData[financialData.monthlyData.length - 1];
    const previousMonth = financialData.monthlyData[financialData.monthlyData.length - 2];
    if (previousMonth.revenue === 0) return 0;
    return ((lastMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100);
  };

  const growth = calculateGrowth();

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financial Overview</h1>
            <p className="text-muted-foreground">Track your revenue, payments, and financial performance</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${financialData?.totalRevenue?.toLocaleString() || '0'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {growth >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(growth).toFixed(1)}% from last month
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-500">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="text-2xl font-bold">${financialData?.paidAmount?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {financialData?.completedOrders || 0} completed orders
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">${financialData?.outstandingAmount?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pending payment
                  </p>
                </div>
                <div className="p-3 rounded-full bg-orange-500">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{financialData?.totalOrders || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lifetime orders
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-500">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Monthly Revenue Trend
              </CardTitle>
              <CardDescription>Revenue performance over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialData?.monthlyData?.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{month.month}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-accent rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${financialData.monthlyData ? (month.revenue / Math.max(...financialData.monthlyData.map(m => m.revenue)) * 100) : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold min-w-[60px] text-right">
                        ${month.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Payment Status Breakdown
              </CardTitle>
              <CardDescription>Current payment status of your orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Paid</span>
                  </div>
                  <span className="text-sm font-bold">${financialData?.paidAmount?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium">Outstanding</span>
                  </div>
                  <span className="text-sm font-bold">${financialData?.outstandingAmount?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Processing</span>
                  </div>
                  <span className="text-sm font-bold">${financialData?.pendingAmount?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Your latest purchase orders and payment status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span>Loading transactions...</span>
                </div>
              </div>
            ) : financialData?.recentTransactions?.length === 0 ? (
              <div className="py-8">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {financialData?.recentTransactions?.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{transaction.po_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.po_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">${transaction.total_amount?.toLocaleString() || '0'}</p>
                        <p className="text-sm text-muted-foreground">{transaction.currency || 'USD'}</p>
                      </div>
                      {getPaymentStatusBadge(transaction.status)}
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default VendorFinances;