
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckInForm from "@/components/inventory/CheckInForm";
import CheckOutForm from "@/components/inventory/CheckOutForm";
import TransferForm from "@/components/inventory/TransferForm";
import { format } from "date-fns";

interface InventoryTransaction {
  id: string;
  type: "check_in" | "check_out" | "transfer" | "adjustment";
  product_id: string;
  source_warehouse_id: string | null;
  target_warehouse_id: string | null;
  quantity: number;
  reference: string | null;
  notes: string | null;
  transaction_date: string;
  user_id: string;
  product: {
    name: string;
  };
  source_warehouse?: {
    name: string;
  } | null;
  target_warehouse?: {
    name: string;
  } | null;
  user: {
    email: string;
  };
}

interface RawTransactionData {
  id: string;
  type: "check_in" | "check_out" | "transfer" | "adjustment";
  product_id: string;
  source_warehouse_id: string | null;
  target_warehouse_id: string | null;
  quantity: number;
  reference: string | null;
  notes: string | null;
  transaction_date: string;
  user_id: string;
  product: {
    name: string;
  };
  source_warehouse: any;
  target_warehouse: any;
  user: {
    email: string;
  };
}

const InventoryTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("check_in");

  // Fetch inventory transactions with fixed relationship queries
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["inventory_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          product:product_id(name),
          source_warehouse:source_warehouse_id(name),
          target_warehouse:target_warehouse_id(name),
          user:user_id(email)
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

      // Transform the raw data to match our expected interface
      const transformedData = (data as RawTransactionData[]).map(item => {
        const transformedItem: InventoryTransaction = {
          ...item,
          source_warehouse: item.source_warehouse_id ? 
            (item.source_warehouse?.error ? { name: "Unknown" } : item.source_warehouse) : 
            null,
          target_warehouse: item.target_warehouse_id ? 
            (item.target_warehouse?.error ? { name: "Unknown" } : item.target_warehouse) : 
            null
        };
        return transformedItem;
      });
      
      return transformedData;
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
      cell: (row: InventoryTransaction) => <div>{row.user.email}</div>,
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
              <Button>New Transaction</Button>
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
