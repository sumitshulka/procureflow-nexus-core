
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DataTable from "@/components/common/DataTable";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import { 
  CheckInForm, 
  CheckOutForm, 
  CheckOutRequestForm, 
  TransferForm 
} from "@/components/inventory";
import ProductTransactionHistory from "@/components/inventory/ProductTransactionHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpFromLine, MoveRight, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryTransaction } from "@/types";

interface EnhancedInventoryTransaction extends InventoryTransaction {
  // These fields should already exist in the InventoryTransaction interface
}

const InventoryTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("transactions");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Fetch inventory transactions with related data
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["inventory_transactions"],
    queryFn: async () => {
      // First fetch all transactions with product and warehouse data
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          product:product_id(name),
          source_warehouse:source_warehouse_id(name),
          target_warehouse:target_warehouse_id(name)
        `)
        .order("transaction_date", { ascending: false });
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch inventory transactions",
          variant: "destructive",
        });
        throw error;
      }

      // Create a set of unique user IDs to fetch
      const userIds = [...new Set(data.map(item => item.user_id))];
      
      if (userIds.length === 0) {
        return data as unknown as InventoryTransaction[];
      }
      
      // Fetch all relevant user data in a single query
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (userError) {
        console.error("Error fetching user data:", userError);
        return data as unknown as InventoryTransaction[];
      }
      
      // Create a user map for quick lookups
      const userMap = (userData || []).reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      // Combine the transaction data with user data
      const enhancedData = data.map(transaction => ({
        ...transaction,
        user: {
          email: userMap[transaction.user_id]?.full_name || "Unknown User"
        }
      }));
      
      // Type cast to match our interface
      return enhancedData as unknown as InventoryTransaction[];
    },
  });

  // Filter transactions based on search term, type, and status
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchTerm || 
      transaction.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || transaction.type === typeFilter;
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'all') || 
      (statusFilter === 'approved' && transaction.approval_status === 'approved') ||
      (statusFilter === 'pending' && transaction.approval_status === 'pending') || 
      (statusFilter === 'rejected' && transaction.approval_status === 'rejected');
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Show transaction history for a product
  const showTransactionHistory = (row: EnhancedInventoryTransaction) => {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted/20 rounded-md">
          <h3 className="text-lg font-medium">{row.product?.name}</h3>
          <p className="text-sm text-muted-foreground">
            Transaction history for this product
          </p>
        </div>
        <ProductTransactionHistory productId={row.product_id} />
      </div>
    );
  };

  // Define table columns
  const columns = [
    {
      id: "date",
      header: "Date",
      cell: (row: EnhancedInventoryTransaction) => (
        <div>{format(new Date(row.transaction_date || row.date || ''), "MMM dd, yyyy HH:mm")}</div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row: EnhancedInventoryTransaction) => (
        <div className="capitalize">
          {row.type.replace("_", " ")}
        </div>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (row: EnhancedInventoryTransaction) => <div>{row.product?.name}</div>,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (row: EnhancedInventoryTransaction) => <div>{row.quantity}</div>,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row: EnhancedInventoryTransaction) => (
        <div>
          {row.type === "check_in" && row.target_warehouse?.name}
          {row.type === "check_out" && row.source_warehouse?.name}
          {row.type === "transfer" && (
            <>
              {row.source_warehouse?.name || "Unknown"} →{" "}
              {row.target_warehouse?.name || "Unknown"}
            </>
          )}
          {row.type === "adjustment" && row.source_warehouse?.name}
        </div>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      cell: (row: EnhancedInventoryTransaction) => <div>{row.reference || "-"}</div>,
    },
    {
      id: "request",
      header: "Request ID",
      cell: (row: EnhancedInventoryTransaction) => <div>{row.request_id || "-"}</div>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row: EnhancedInventoryTransaction) => {
        if (row.type !== "check_out" || !row.approval_status) return <div>-</div>;
        
        switch (row.approval_status) {
          case "approved":
            return <div className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Approved</div>;
          case "pending":
            return <div className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Pending</div>;
          case "rejected":
            return <div className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Rejected</div>;
          default:
            return <div>-</div>;
        }
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: (row: EnhancedInventoryTransaction) => (
        <div className="max-w-xs truncate">{row.notes || "-"}</div>
      ),
    },
    {
      id: "user",
      header: "User",
      cell: (row: EnhancedInventoryTransaction) => <div>{row.user?.email || "Unknown"}</div>,
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Transactions"
        description="Manage inventory check-ins, check-outs, and transfers"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="check_in">
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Check In
          </TabsTrigger>
          <TabsTrigger value="check_out">
            <ArrowUpFromLine className="w-4 h-4 mr-2" />
            Check Out
          </TabsTrigger>
          <TabsTrigger value="transfer">
            <MoveRight className="w-4 h-4 mr-2" />
            Transfer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product or reference..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="check_in">Check In</SelectItem>
                  <SelectItem value="check_out">Check Out</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-8">Loading transactions...</div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredTransactions}
                  emptyMessage="No inventory transactions found."
                  showDetailPanel={showTransactionHistory}
                  detailPanelTitle="Transaction History"
                  detailPanelDescription="View all transactions for this product"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="check_in">
          <Card>
            <CardContent className="pt-6">
              <CheckInForm
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "Inventory check-in completed successfully",
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["inventory_transactions"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["inventory_items"],
                  });
                  setActiveTab("transactions");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="check_out">
          <Card>
            <CardContent className="pt-6">
              <CheckOutRequestForm
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "Checkout request submitted for approval",
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["inventory_transactions"],
                  });
                  setActiveTab("transactions");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer">
          <Card>
            <CardContent className="pt-6">
              <TransferForm
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "Inventory transfer completed successfully",
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["inventory_transactions"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["inventory_items"],
                  });
                  setActiveTab("transactions");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryTransactions;
