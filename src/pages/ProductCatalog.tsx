import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, Tag, Filter, Loader2 } from "lucide-react";
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

// Type for products from Supabase
interface Product {
  id: string;
  name: string;
  description: string;
  category: {
    id: string;
    name: string;
  } | null;
  classification: string;
  unit: {
    name: string;
    abbreviation?: string;
  } | null;
  current_price: number | null;
  tags: string[];
}

// Type for categories from Supabase
interface Category {
  id: string;
  name: string;
}

const ProductCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterClassification, setFilterClassification] = useState<string>("");
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 2000]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Fetch products from Supabase
  const fetchProducts = async (): Promise<Product[]> => {
    console.log("Fetching products");
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          description, 
          classification,
          current_price,
          tags,
          category:category_id(id, name),
          unit:unit_id(id, name, abbreviation)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching products:", error);
        throw new Error(error.message);
      }
      
      console.log("Products fetched:", data);
      return data || [];
    } catch (err) {
      console.error("Exception fetching products:", err);
      throw err;
    }
  };

  const { 
    data: products = [], 
    isLoading: isProductsLoading, 
    error: productsError,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  // Fetch categories for the filter
  const fetchCategories = async (): Promise<Category[]> => {
    console.log("Fetching categories");
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
  
      if (error) {
        console.error("Error fetching categories:", error);
        throw new Error(error.message);
      }

      console.log("Categories fetched:", data);
      return data || [];
    } catch (err) {
      console.error("Exception fetching categories:", err);
      throw err;
    }
  };

  // Fixed the useQuery to use proper error handling
  const { 
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    meta: {
      onError: (error: Error) => {
        console.error("Categories query error:", error);
        toast({
          title: "Failed to load categories",
          description: "Categories could not be loaded. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Get all unique tags from products
  const allTags = Array.from(
    new Set(products.flatMap((product) => product.tags || []))
  );

  // Filter products based on search and filter criteria
  const filteredProducts = products.filter((product) => {
    // Search term filter
    const matchesSearchTerm = 
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (product.category?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = 
      filterCategory === "" || 
      (product.category?.name === filterCategory);
    
    // Classification filter
    const matchesClassification = 
      filterClassification === "" || 
      product.classification === filterClassification;
    
    // Price range filter
    const matchesPriceRange = 
      product.current_price === null || (
        product.current_price >= filterPriceRange[0] && 
        product.current_price <= filterPriceRange[1]
      );
    
    // Tags filter
    const matchesTags = 
      filterTags.length === 0 || 
      filterTags.some(tag => (product.tags || []).includes(tag));
    
    return matchesSearchTerm && matchesCategory && matchesClassification && 
           matchesPriceRange && matchesTags;
  });

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

  // Apply filters and close sheet
  const applyFilters = () => {
    setIsFilterSheetOpen(false);
  };

  // Show error if data fetching fails
  useEffect(() => {
    if (productsError) {
      toast({
        title: "Failed to load products",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  }, [productsError]);

  // Show error for categories fetching if there's an issue
  useEffect(() => {
    if (categoriesError) {
      toast({
        title: "Failed to load categories",
        description: "Categories could not be loaded. Please try again.",
        variant: "destructive",
      });
    }
  }, [categoriesError]);

  // Table columns configuration for table view
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
      cell: (row: any) => row.category?.name || "N/A",
    },
    {
      id: "unit",
      header: "Unit",
      cell: (row: any) => row.unit?.name || "N/A",
    },
    {
      id: "price",
      header: "Current Price",
      cell: (row: any) =>
        row.current_price != null 
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(row.current_price)
          : "N/A",
    },
    {
      id: "tags",
      header: "Tags",
      cell: (row: any) => (
        <div className="flex flex-wrap gap-1">
          {(row.tags || []).map((tag: string, i: number) => (
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
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate(`/product/${row.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  if (isProductsLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading products...</span>
        </div>
      </div>
    );
  }

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
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
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
                    {isCategoriesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading categories...</span>
                      </div>
                    ) : categoriesError ? (
                      <div className="text-destructive text-sm p-2">
                        Failed to load categories. Please try again.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button 
                          variant={filterCategory === "" ? "default" : "outline"}
                          onClick={() => setFilterCategory("")}
                          className="w-full justify-start mb-2"
                        >
                          All Categories
                        </Button>
                        <div className="grid grid-cols-1 gap-2">
                          {categories.map((category) => (
                            <Button 
                              key={category.id} 
                              variant={filterCategory === category.name ? "default" : "outline"}
                              onClick={() => setFilterCategory(category.name)}
                              className="w-full justify-start"
                            >
                              {category.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tags">
                  <AccordionTrigger>Tags</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Array.isArray(allTags) && allTags.length > 0 ? (
                        allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={filterTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No tags available
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
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
                <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/product/${product.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {product.id} · {product.category?.name || "No Category"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={product.classification === "goods" ? "default" : "secondary"}>
                          {product.classification === "goods" ? "Goods" : "Services"}
                        </Badge>
                        <span className="text-xs">{product.unit?.name || "N/A"}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || "No description available"}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-medium text-lg">
                        {product.current_price != null ? 
                          new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(product.current_price) : 
                          "Price not set"
                        }
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <div className="flex flex-wrap gap-1 items-center">
                      {product.tags && product.tags.length > 0 ? (
                        <>
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
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      )}
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
