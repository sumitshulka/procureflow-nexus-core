
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/common/DataTable";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceHistoryData {
  id: string;
  price: number;
  currency: string;
  effective_date: string;
  source_type: string;
  purchase_order_number?: string;
  notes?: string;
  created_by_name?: string;
}

interface ProductPriceHistoryProps {
  productId: string;
  productName: string;
}

const ProductPriceHistory: React.FC<ProductPriceHistoryProps> = ({ productId, productName }) => {
  const { data: priceHistory = [], isLoading } = useQuery({
    queryKey: ["product_price_history", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_history")
        .select(`
          *,
          purchase_order:purchase_order_id(po_number),
          creator:created_by(full_name)
        `)
        .eq("product_id", productId)
        .order("effective_date", { ascending: false });

      if (error) {
        throw error;
      }

      return data.map((item: any) => ({
        id: item.id,
        price: item.price,
        currency: item.currency,
        effective_date: item.effective_date,
        source_type: item.source_type,
        purchase_order_number: item.purchase_order?.po_number,
        notes: item.notes,
        created_by_name: item.creator?.full_name || "Unknown User",
      })) as PriceHistoryData[];
    },
  });

  const getPriceTrend = (currentPrice: number, index: number) => {
    if (index === priceHistory.length - 1) return null; // No previous price
    
    const previousPrice = priceHistory[index + 1]?.price;
    if (!previousPrice) return null;
    
    if (currentPrice > previousPrice) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (currentPrice < previousPrice) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const columns = [
    {
      id: "effective_date",
      header: "Date",
      cell: (row: PriceHistoryData) => (
        <div>{format(new Date(row.effective_date), "MMM dd, yyyy")}</div>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: (row: PriceHistoryData, index: number) => (
        <div className="flex items-center gap-2">
          <span className="font-mono">
            {row.currency} {row.price.toLocaleString()}
          </span>
          {getPriceTrend(row.price, index)}
        </div>
      ),
    },
    {
      id: "source_type",
      header: "Source",
      cell: (row: PriceHistoryData) => (
        <div className="capitalize">
          {row.source_type.replace("_", " ")}
        </div>
      ),
    },
    {
      id: "purchase_order_number",
      header: "PO Number",
      cell: (row: PriceHistoryData) => (
        <div>{row.purchase_order_number || "-"}</div>
      ),
    },
    {
      id: "created_by_name",
      header: "Created By",
      cell: (row: PriceHistoryData) => (
        <div>{row.created_by_name}</div>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      cell: (row: PriceHistoryData) => (
        <div className="max-w-xs truncate">{row.notes || "-"}</div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">Loading price history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Price History for {productName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {priceHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No price history available for this product.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={priceHistory}
            emptyMessage="No price history found."
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ProductPriceHistory;
