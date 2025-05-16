import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2, Check, X } from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the location schema
const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  is_active: z.boolean().default(true),
});

type LocationFormValues = z.infer<typeof locationSchema>;

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const LocationsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  
  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch locations",
          variant: "destructive",
        });
        throw error;
      }
      
      return data as Location[];
    },
  });

  // Create location mutation
  const createLocation = useMutation({
    mutationFn: async (values: Omit<LocationFormValues, "id">) => {
      if (!values.name) {
        throw new Error("Name is required");
      }
      
      const { data, error } = await supabase
        .from("locations")
        .insert([values])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: "Success",
        description: "Location created successfully",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocation = useMutation({
    mutationFn: async (values: LocationFormValues) => {
      const { id, ...updateData } = values;
      const { data, error } = await supabase
        .from("locations")
        .update(updateData)
        .eq("id", id)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
      setIsOpen(false);
      setCurrentLocation(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Define form
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      is_active: true,
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setCurrentLocation(null);
    } else if (currentLocation) {
      form.reset({
        id: currentLocation.id,
        name: currentLocation.name,
        address: currentLocation.address || "",
        city: currentLocation.city || "",
        state: currentLocation.state || "",
        postal_code: currentLocation.postal_code || "",
        country: currentLocation.country || "",
        is_active: currentLocation.is_active,
      });
    }
  }, [isOpen, currentLocation, form]);

  // Handle form submission
  const onSubmit = (values: LocationFormValues) => {
    if (currentLocation) {
      updateLocation.mutate(values);
    } else {
      createLocation.mutate(values);
    }
  };

  // Handle edit location
  const handleEdit = (location: Location) => {
    setCurrentLocation(location);
    setIsOpen(true);
  };

  // Handle delete confirmation
  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this location?")) {
      deleteLocation.mutate(id);
    }
  };

  // Define table columns
  const columns = [
    {
      id: "name",
      header: "Name",
      cell: (row: Location) => <div className="font-medium">{row.name}</div>,
    },
    {
      id: "address",
      header: "Address",
      cell: (row: Location) => (
        <div>
          {row.address}
          {row.city && row.state ? `, ${row.city}, ${row.state}` : row.city ? `, ${row.city}` : row.state ? `, ${row.state}` : ""}
          {row.postal_code ? ` ${row.postal_code}` : ""}
          {row.country ? `, ${row.country}` : ""}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: Location) => (
        <div className={row.is_active ? "text-green-600" : "text-red-600"}>
          {row.is_active ? "Active" : "Inactive"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row: Location) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Locations Management</h2>
          <p className="text-muted-foreground">
            Manage your organization's physical locations
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {currentLocation ? "Edit Location" : "Add New Location"}
              </DialogTitle>
              <DialogDescription>
                {currentLocation
                  ? "Update the location details."
                  : "Create a new location for your organization."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter street address"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter city"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter state or province"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter postal code"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter country"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Active
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {currentLocation ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">Loading locations...</div>
          ) : (
            <DataTable
              columns={columns}
              data={locations}
              emptyMessage="No locations found. Click 'Add Location' to create one."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationsManagement;
