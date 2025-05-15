
import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, Tag } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const ProductCatalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  // Mock product data
  const products = [
    {
      id: "PRD-001",
      name: "Executive Office Chair",
      description:
        "Ergonomic high-back office chair with adjustable lumbar support and armrests",
      category: "Furniture",
      unit: "Each",
      currentPrice: 349.99,
      vendorCount: 3,
      tags: ["office", "furniture", "ergonomic"],
    },
    {
      id: "PRD-002",
      name: "Laptop Computer - 15.6\"",
      description:
        "Business laptop with Intel i7, 16GB RAM, 512GB SSD, Windows 11 Pro",
      category: "IT Equipment",
      unit: "Each",
      currentPrice: 1299.99,
      vendorCount: 5,
      tags: ["electronics", "computer", "laptop"],
    },
    {
      id: "PRD-003",
      name: "A4 Copy Paper - 80gsm",
      description: "Premium quality A4 white copy paper, 500 sheets per ream",
      category: "Office Supplies",
      unit: "Ream",
      currentPrice: 5.49,
      vendorCount: 8,
      tags: ["paper", "supplies", "printing"],
    },
    {
      id: "PRD-004",
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse with adjustable DPI, USB receiver",
      category: "IT Accessories",
      unit: "Each",
      currentPrice: 24.99,
      vendorCount: 6,
      tags: ["electronics", "accessory", "mouse"],
    },
    {
      id: "PRD-005",
      name: "Whiteboard - 120x90cm",
      description:
        "Magnetic whiteboard with aluminium frame, wall mountable, includes marker set",
      category: "Office Equipment",
      unit: "Each",
      currentPrice: 89.99,
      vendorCount: 4,
      tags: ["office", "equipment", "presentation"],
    },
    {
      id: "PRD-006",
      name: "External Hard Drive - 2TB",
      description: "Portable USB 3.0 external hard drive with 2TB storage",
      category: "IT Storage",
      unit: "Each",
      currentPrice: 79.99,
      vendorCount: 7,
      tags: ["electronics", "storage", "backup"],
    },
  ];

  const filteredProducts = products.filter(
    (product) =>
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags.some((tag) => tag.includes(searchTerm.toLowerCase()))
  );

  const productColumns = [
    {
      id: "id",
      header: "Product ID",
      cell: (row: any) => <span className="font-medium">{row.id}</span>,
    },
    {
      id: "name",
      header: "Name",
      cell: (row: any) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "category",
      header: "Category",
      cell: (row: any) => row.category,
    },
    {
      id: "unit",
      header: "Unit",
      cell: (row: any) => row.unit,
    },
    {
      id: "price",
      header: "Current Price",
      cell: (row: any) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(row.currentPrice),
    },
    {
      id: "vendors",
      header: "Vendors",
      cell: (row: any) => `${row.vendorCount} vendors`,
    },
    {
      id: "tags",
      header: "Tags",
      cell: (row: any) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.map((tag: string, i: number) => (
            <Badge variant="outline" key={i} className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row: any) => (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost">
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Product & Service Catalog"
        description="Browse and manage products and services"
        actions={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search catalog..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {product.id} · {product.category}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{product.unit}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-medium text-lg">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(product.currentPrice)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.vendorCount} vendors
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="flex flex-wrap gap-1 items-center">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {product.tags.map((tag, i) => (
                      <Badge
                        variant="outline"
                        key={i}
                        className="text-xs px-2 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <DataTable
            columns={productColumns}
            data={filteredProducts}
            emptyMessage="No products found"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductCatalog;
