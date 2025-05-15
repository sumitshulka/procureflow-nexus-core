
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";

import PageHeader from "@/components/common/PageHeader";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// Product form validation schema
const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  classification: z.enum(["goods", "services"], {
    required_error: "Classification is required",
  }),
  unit: z.string().min(1, "Unit is required"),
  currentPrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
});

const AddProduct = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  // Form setup
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      classification: "goods",
      unit: "",
      currentPrice: "",
    },
  });

  // Handle tag addition
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentTag.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(currentTag.trim().toLowerCase())) {
        setTags([...tags, currentTag.trim().toLowerCase()]);
        setCurrentTag("");
      } else {
        toast({
          title: "Tag already exists",
          description: "This tag has already been added",
          variant: "destructive",
        });
      }
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Form submission
  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    // Here we would typically send data to the database
    // For now, just show a success message
    console.log({ ...values, tags });
    
    toast({
      title: "Product created",
      description: "The product has been successfully created",
    });
    
    // Navigate back to catalog
    navigate("/catalog");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Add New Product"
        description="Create a new product in the catalog"
        actions={
          <div className="space-x-2">
            <Button variant="outline" onClick={() => navigate("/catalog")}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)}>Save Product</Button>
          </div>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
          {/* Basic Information */}
          <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Furniture, IT Equipment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter product description"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Classification & Units */}
          <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">Classification & Units</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classification</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="goods">Goods</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determine if this is a physical good or a service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Each, Box, Hour" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unit of measurement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Price (USD)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">Tags</h3>
            <div className="space-y-4">
              <div>
                <FormLabel htmlFor="tags">Add Tags</FormLabel>
                <Input
                  id="tags"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Press Enter to add a new tag
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-2 py-1 text-sm flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">
                    No tags added yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddProduct;
