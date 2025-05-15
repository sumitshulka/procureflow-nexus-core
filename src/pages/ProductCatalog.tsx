
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Search, Tag, Filter } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ProductCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterClassification, setFilterClassification] = useState<string>("");
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 2000]);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Mock product data
  const products = [
    {
      id: "PRD-001",
      name: "Executive Office Chair",
      description:
        "Ergonomic high-back office chair with adjustable lumbar support and armrests",
      category: "Furniture",
      classification: "goods",
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
      classification: "goods",
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
      classification: "goods",
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
      classification: "goods",
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
      classification: "goods",
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
      classification: "goods",
      unit: "Each",
      currentPrice: 79.99,
      vendorCount: 7,
      tags: ["electronics", "storage", "backup"],
    },
    {
      id: "PRD-007",
      name: "IT Support - Basic",
      description: "Basic IT support package including helpdesk and remote assistance",
      category: "IT Services",
      classification: "services",
      unit: "Hour",
      currentPrice: 75.00,
      vendorCount: 4,
      tags: ["support", "it", "service"],
    },
    {
      id: "PRD-008",
      name: "Office Cleaning",
      description: "Professional office cleaning service, includes vacuuming and dusting",
      category: "Facility Management",
      classification: "services",
      unit: "Session",
      currentPrice: 120.00,
      vendorCount: 3,
      tags: ["cleaning", "facility", "maintenance"],
    },
  ];

  // Unique categories and tags for filters
  const categories = [...new Set(products.map(product => product.category))];
  const allTags = [...new Set(products.flatMap(product => product.tags))];

  // Filter products based on search and filter criteria
  const filteredProducts = products.filter(
    (product) => {
      // Search term filter
      const matchesSearchTerm = 
        searchTerm === "" ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags.some((tag) => tag.includes(searchTerm.toLowerCase()));
      
      // Category filter
      const matchesCategory = 
        filterCategory === "" || 
        product.category === filterCategory;
      
      // Classification filter
      const matchesClassification = 
        filterClassification === "" || 
        product.classification === filterClassification;
      
      // Price range filter
      const matchesPriceRange = 
        product.currentPrice >= filterPriceRange[0] && 
        product.currentPrice <= filterPriceRange[1];
      
      // Tags filter
      const matchesTags = 
        filterTags.length === 0 || 
        filterTags.some(tag => product.tags.includes(tag));
      
      return matchesSearchTerm && matchesCategory && matchesClassification && 
             matchesPriceRange && matchesTags;
    }
  );

  // Clear all filters
  const clearFilters = () => {
    setFilterCategory("");
    setFilterClassification("");
    setFilterPriceRange([0, 2000]);
    setFilterTags([]);
  };

  // Handle tag selection
  const toggleTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter(t => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

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
      id: "classification",
      header: "Classification",
      cell: (row: any) => (
        <Badge variant={row.classification === "goods" ? "default" : "secondary"}>
          {row.classification === "goods" ? "Goods" : "Services"}
        </Badge>
      ),
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
          <Button size="sm" onClick={() => navigate("/add-product")}>
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
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 md:w-auto">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {(filterCategory || filterClassification || filterTags.length > 0) && (
                <Badge className="ml-1 h-6 w-6 p-0 flex items-center justify-center">
                  {(filterCategory ? 1 : 0) + 
                   (filterClassification ? 1 : 0) + 
                   (filterTags.length > 0 ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filter Products</SheetTitle>
              <SheetDescription>
                Apply filters to narrow down your search results
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="classification">
                  <AccordionTrigger>Classification</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button 
                        variant={filterClassification === "goods" ? "default" : "outline"}
                        onClick={() => setFilterClassification(
                          filterClassification === "goods" ? "" : "goods"
                        )}
                        className="justify-start"
                      >
                        Goods
                      </Button>
                      <Button 
                        variant={filterClassification === "services" ? "default" : "outline"}
                        onClick={() => setFilterClassification(
                          filterClassification === "services" ? "" : "services"
                        )}
                        className="justify-start"
                      >
                        Services
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="category">
                  <AccordionTrigger>Category</AccordionTrigger>
                  <AccordionContent>
                    <Select
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tags">
                  <AccordionTrigger>Tags</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={filterTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button size="sm">Apply Filters</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No products match your search criteria</p>
            </div>
          ) : (
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
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={product.classification === "goods" ? "default" : "secondary"}>
                          {product.classification === "goods" ? "Goods" : "Services"}
                        </Badge>
                        <span className="text-xs">{product.unit}</span>
                      </div>
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
          )}
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
