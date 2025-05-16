
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DataTable from "@/components/common/DataTable";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import CheckInForm from "@/components/inventory/CheckInForm";
import CheckOutForm from "@/components/inventory/CheckOutForm";
import TransferForm from "@/components/inventory/TransferForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

interface InventoryTransaction {
  id: string;
  type: string;
  product_id: string;
  source_warehouse_id: string | null;
  target_warehouse_id: string | null;
  quantity: number;
  reference: string;
  transaction_date: string;
  notes: string | null;
  user_id: string;
  product: {
    name: string;
  };
  source_warehouse: {
    name: string;
  } | null;
  target_warehouse: {
    name: string;
  } | null;
}

const InventoryTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("check_in");

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
      
      // Fetch all relevant user emails in a single query
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (userError) {
        console.error("Error fetching user data:", userError);
      }
      
      // Create a user map for quick lookups
      const userMap = (userData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      // Combine the transaction data with user data
      return data.map(transaction => ({
        ...transaction,
        user: {
          email: userMap[transaction.user_id]?.email || "Unknown User"
        }
      }));
    },
  });

  // Define table columns
  const columns = [
    {
      id: "date",
      header: "Date",
      cell: (row: InventoryTransaction) => (
        <div>{format(new Date(row.transaction_date), "MMM dd, yyyy HH:mm")}</div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row: InventoryTransaction) => (
        <div className="capitalize">
          {row.type.replace("_", " ")}
        </div>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (row: InventoryTransaction) => <div>{row.product.name}</div>,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (row: InventoryTransaction) => <div>{row.quantity}</div>,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row: InventoryTransaction) => (
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
      cell: (row: InventoryTransaction) => <div>{row.reference || "-"}</div>,
    },
    {
      id: "notes",
      header: "Notes",
      cell: (row: InventoryTransaction) => (
        <div className="max-w-xs truncate">{row.notes || "-"}</div>
      ),
    },
    {
      id: "user",
      header: "User",
      cell: (row: InventoryTransaction) => <div>{row.user?.email || "Unknown"}</div>,
    },
  ];

  // Handle change of tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Transactions"
        description="Manage inventory check-ins, check-outs, and transfers"
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>New Inventory Transaction</DialogTitle>
                <DialogDescription>
                  Record a new inventory movement
                </DialogDescription>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="check_in">Check In</TabsTrigger>
                  <TabsTrigger value="check_out">Check Out</TabsTrigger>
                  <TabsTrigger value="transfer">Transfer</TabsTrigger>
                </TabsList>

                <TabsContent value="check_in" className="space-y-4">
                  <CheckInForm
                    onSuccess={() => {
                      setIsOpen(false);
                      queryClient.invalidateQueries({
                        queryKey: ["inventory_transactions"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["inventory_items"],
                      });
                    }}
                  />
                </TabsContent>

                <TabsContent value="check_out" className="space-y-4">
                  <CheckOutForm
                    onSuccess={() => {
                      setIsOpen(false);
                      queryClient.invalidateQueries({
                        queryKey: ["inventory_transactions"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["inventory_items"],
                      });
                    }}
                  />
                </TabsContent>

                <TabsContent value="transfer" className="space-y-4">
                  <TransferForm
                    onSuccess={() => {
                      setIsOpen(false);
                      queryClient.invalidateQueries({
                        queryKey: ["inventory_transactions"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["inventory_items"],
                      });
                    }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">Loading transactions...</div>
          ) : (
            <DataTable
              columns={columns}
              data={transactions}
              emptyMessage="No inventory transactions found."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryTransactions;
