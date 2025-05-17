
import React from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ProductTransactionHistoryProps {
  productId: string;
}

interface Transaction {
  id: string;
  transaction_date: string;
  type: string;
  quantity: number;
  source_warehouse?: { name: string } | null;
  target_warehouse?: { name: string } | null;
  reference: string | null;
  notes: string | null;
  approval_status: string | null;
  user: { email: string } | null;
}

const ProductTransactionHistory: React.FC<ProductTransactionHistoryProps> = ({ productId }) => {
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["product_transactions", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          id,
          transaction_date,
          type,
          quantity,
          source_warehouse:source_warehouse_id(name),
          target_warehouse:target_warehouse_id(name),
          reference,
          notes,
          approval_status,
          user_id
        `)
        .eq("product_id", productId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      // Fetch user data for each transaction
      const userIds = Array.from(new Set(data.map(item => item.user_id)));
      
      // Get user profile details
      let userMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (!userError && userData) {
          userMap = userData.reduce((acc: Record<string, any>, user) => {
            acc[user.id] = { email: user.full_name || "Unknown User" };
            return acc;
          }, {});
        }
      }

      // Combine transaction data with user data
      return data.map((transaction) => ({
        ...transaction,
        user: userMap[transaction.user_id] || { email: "Unknown User" }
      }));
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-md">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center mt-2">
              <Skeleton className="h-4 w-36 mr-2" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load transaction history. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-4 border rounded-md text-muted-foreground">
        No transaction history found for this product.
      </div>
    );
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "check_in":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Check In</Badge>;
      case "check_out":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Check Out</Badge>;
      case "transfer":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Transfer</Badge>;
      case "adjustment":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="p-4 border rounded-md">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              {getTransactionTypeLabel(transaction.type)}
              <span className="ml-2 font-medium">
                {transaction.quantity} {transaction.quantity === 1 ? "unit" : "units"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(transaction.transaction_date), "MMM dd, yyyy HH:mm")}
            </div>
          </div>
          
          <div className="mt-2">
            {transaction.type === "check_in" && (
              <p className="text-sm">
                Checked into <span className="font-medium">{transaction.target_warehouse?.name || "Unknown"}</span>
              </p>
            )}
            {transaction.type === "check_out" && (
              <p className="text-sm">
                Checked out from <span className="font-medium">{transaction.source_warehouse?.name || "Unknown"}</span>
                {transaction.approval_status && (
                  <span className="ml-2">{getStatusBadge(transaction.approval_status)}</span>
                )}
              </p>
            )}
            {transaction.type === "transfer" && (
              <p className="text-sm">
                Transferred from <span className="font-medium">{transaction.source_warehouse?.name || "Unknown"}</span> to{" "}
                <span className="font-medium">{transaction.target_warehouse?.name || "Unknown"}</span>
              </p>
            )}
          </div>
          
          {(transaction.reference || transaction.notes) && (
            <div className="mt-2 text-sm text-muted-foreground">
              {transaction.reference && <p><span className="font-medium">Reference:</span> {transaction.reference}</p>}
              {transaction.notes && <p><span className="font-medium">Notes:</span> {transaction.notes}</p>}
            </div>
          )}
          
          <div className="mt-2 text-xs text-muted-foreground">
            Processed by: {transaction.user?.email}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductTransactionHistory;
