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
import { getCurrencySymbol } from '@/utils/currencyUtils';

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VendorApprovalGuard from '@/components/vendor/VendorApprovalGuard';

const VendorFinances = () => {
  return (
    <VendorApprovalGuard>
      <VendorFinancesContent />
    </VendorApprovalGuard>
  );
};

const VendorFinancesContent = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('12m');

  // Fetch financial data based on INVOICES (revenue/paid/outstanding)
  const { data: financialData, isLoading } = useQuery({
    queryKey: ["vendor_finances", user?.id, timeframe],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: vendorReg, error: vendorError } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (vendorError) throw vendorError;
      if (!vendorReg) return null;

      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("vendor_id", vendorReg.id)
        .order("invoice_date", { ascending: false });

      if (invError) throw invError;

      const sumByCurrency = (rows: any[]) => {
        const map: Record<string, number> = {};
        rows.forEach((r) => {
          const cur = r.currency || 'USD';
          map[cur] = (map[cur] || 0) + (Number(r.total_amount) || 0);
        });
        return map;
      };

      const all = invoices || [];
      const paidRows = all.filter((i: any) => i.status === 'paid');
      const outstandingRows = all.filter((i: any) => !['paid', 'cancelled', 'rejected', 'draft'].includes(i.status));
      const processingRows = all.filter((i: any) => ['submitted', 'pending_approval', 'approved'].includes(i.status));

      // Monthly revenue (by invoice_date), keep currency of dominant invoice for label
      const monthlyData: Array<{ month: string; revenue: number; orders: number; currency: string }> = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthInvoices = all.filter((inv: any) => {
          const d = new Date(inv.invoice_date);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        });
        const totals = sumByCurrency(monthInvoices);
        const topCur = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
        monthlyData.push({
          month: format(date, 'MMM'),
          revenue: topCur ? topCur[1] : 0,
          orders: monthInvoices.length,
          currency: topCur ? topCur[0] : 'USD',
        });
      }

      return {
        revenueByCurrency: sumByCurrency(all),
        paidByCurrency: sumByCurrency(paidRows),
        outstandingByCurrency: sumByCurrency(outstandingRows),
        processingByCurrency: sumByCurrency(processingRows),
        totalInvoices: all.length,
        paidInvoices: paidRows.length,
        monthlyData,
        recentTransactions: all.slice(0, 10),
      };
    },
    enabled: !!user?.id,
  });

  const formatMulti = (totals: Record<string, number> | undefined) => {
    if (!totals) return '0';
    const entries = Object.entries(totals).filter(([, v]) => v > 0);
    if (entries.length === 0) return '0';
    return entries.map(([cur, v]) => `${getCurrencySymbol(cur)}${v.toLocaleString()}`).join(' • ');
  };

  const getInvoicePaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'submitted':
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Financial Overview</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Track your revenue, payments, and financial performance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-full sm:w-[150px]">
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
                  <p className="text-2xl font-bold">{formatMulti(financialData?.revenueByCurrency)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all invoices</p>
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
                  <p className="text-2xl font-bold">{formatMulti(financialData?.paidByCurrency)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {financialData?.paidInvoices || 0} paid invoices
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
                  <p className="text-2xl font-bold">{formatMulti(financialData?.outstandingByCurrency)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Pending payment</p>
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
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{financialData?.totalInvoices || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Lifetime invoices</p>
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
                        {getCurrencySymbol(month.currency)}{month.revenue.toLocaleString()}
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
                  <span className="text-sm font-bold">{formatMulti(financialData?.paidByCurrency)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium">Outstanding</span>
                  </div>
                  <span className="text-sm font-bold">{formatMulti(financialData?.outstandingByCurrency)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Processing</span>
                  </div>
                  <span className="text-sm font-bold">{formatMulti(financialData?.processingByCurrency)}</span>
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
                        <p className="font-medium">{transaction.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.invoice_date ? format(new Date(transaction.invoice_date), 'MMM dd, yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">{getCurrencySymbol(transaction.currency || 'USD')}{Number(transaction.total_amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{transaction.currency || 'USD'}</p>
                      </div>
                      {getInvoicePaymentBadge(transaction.status)}
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