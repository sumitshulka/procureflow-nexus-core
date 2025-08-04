import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the warehouse schema with improved location validation
const warehouseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  manager_id: z.string().optional(),
  is_active: z.boolean().default(true),
  locations: z.array(z.string()).min(1, "At least one location must be selected"),
  primary_location_id: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

// Define the SupabaseUser type
interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

type Warehouse = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Location = {
  id: string;
  name: string;
};

// Define the WarehouseLocation type
type WarehouseLocation = {
  id: string;
  warehouse_id: string;
  location_id: string;
  is_primary: boolean;
};

type WarehouseWithLocations = Warehouse & {
  locations: {
    id: string;
    name: string;
    is_primary: boolean;
  }[];
  manager?: {
    id: string;
    email: string;
    full_name?: string;
  };
};

const Warehouses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState<WarehouseWithLocations | null>(null);

  // Fetch warehouses with their locations
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses_with_locations"],
    queryFn: async () => {
      // Fetch warehouses
      const { data: warehousesData, error: warehousesError } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");
      
      if (warehousesError) {
        toast({
          title: "Error",
          description: "Failed to fetch warehouses",
          variant: "destructive",
        });
        throw warehousesError;
      }
      
      // Fetch warehouse locations
      const { data: warehouseLocationsData, error: warehouseLocationsError } = await supabase
        .from("warehouse_locations")
        .select("*");
      
      if (warehouseLocationsError) {
        toast({
          title: "Error",
          description: "Failed to fetch warehouse locations",
          variant: "destructive",
        });
        throw warehouseLocationsError;
      }
      
      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*");
      
      if (locationsError) {
        toast({
          title: "Error",
          description: "Failed to fetch locations",
          variant: "destructive",
        });
        throw locationsError;
      }
      
      // Fetch managers using secure Edge Function
      let managers: SupabaseUser[] = [];
      try {
        const { data: managersData, error: managersError } = await supabase.functions.invoke('admin-list-users');
        
        if (managersError) {
          console.error("Failed to fetch managers:", managersError);
        } else if (managersData?.data?.users) {
          managers = managersData.data.users as SupabaseUser[];
        }
      } catch (error) {
        console.error("Failed to fetch managers (this might be expected if not admin):", error);
        // Don't throw, just continue with empty managers
      }
      
      // Combine data
      const warehousesWithLocations = warehousesData.map((warehouse: Warehouse) => {
        // Find warehouse locations
        const warehouseLocations = warehouseLocationsData.filter(
          (wl: WarehouseLocation) => wl.warehouse_id === warehouse.id
        );
        
        // Map locations data
        const locations = warehouseLocations.map((wl: WarehouseLocation) => {
          const location = locationsData.find((l: Location) => l.id === wl.location_id);
          return {
            id: wl.location_id,
            name: location?.name || "Unknown Location",
            is_primary: wl.is_primary,
          };
        });
        
        // Find manager
        let manager;
        if (warehouse.manager_id) {
          const managerData = managers.find(m => m.id === warehouse.manager_id);
          if (managerData) {
            manager = {
              id: managerData.id,
              email: managerData.email,
              full_name: managerData.user_metadata?.full_name,
            };
          }
        }
        
        return {
          ...warehouse,
          locations,
          manager,
        };
      });
      
      return warehousesWithLocations as WarehouseWithLocations[];
    },
  });

  // Fetch locations for form
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ["locations_for_warehouse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
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

  // Fetch users for manager selection
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users_for_warehouse_managers"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-list-users');
        
        if (error) {
          console.error("Failed to fetch users:", error);
          return [];
        }
        
        return data?.data?.users as SupabaseUser[] || [];
      } catch (error) {
        console.error("Failed to fetch users (this might be expected if not admin):", error);
        return [];
      }
    },
    retry: false, // Don't retry as this might fail if not an admin
  });

  // Create warehouse mutation
  const createWarehouse = useMutation({
    mutationFn: async (values: WarehouseFormValues) => {
      const { locations: locationIds, primary_location_id, ...warehouseData } = values;
      
      // First create the warehouse
      const { data: newWarehouse, error: warehouseError } = await supabase
        .from("warehouses")
        .insert([{ 
          name: warehouseData.name,
          description: warehouseData.description || null,
          manager_id: warehouseData.manager_id === "_none" ? null : warehouseData.manager_id || null,
          is_active: warehouseData.is_active,
        }])
        .select();
      
      if (warehouseError) throw warehouseError;
      
      // Then create the warehouse-location relations with primary location
      const warehouseLocations = locationIds.map((locationId) => ({
        warehouse_id: newWarehouse[0].id,
        location_id: locationId,
        is_primary: locationId === primary_location_id,
      }));
      
      const { error: locationsError } = await supabase
        .from("warehouse_locations")
        .insert(warehouseLocations);
      
      if (locationsError) throw locationsError;
      
      return newWarehouse[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses_with_locations"] });
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create warehouse: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update warehouse mutation
  const updateWarehouse = useMutation({
    mutationFn: async (values: WarehouseFormValues) => {
      const { id, locations: locationIds, primary_location_id, ...warehouseData } = values;
      
      // Update the warehouse
      const { error: warehouseError } = await supabase
        .from("warehouses")
        .update({ 
          name: warehouseData.name,
          description: warehouseData.description || null,
          manager_id: warehouseData.manager_id === "_none" ? null : warehouseData.manager_id || null,
          is_active: warehouseData.is_active,
        })
        .eq("id", id);
      
      if (warehouseError) throw warehouseError;
      
      // Delete existing warehouse-location relations
      const { error: deleteError } = await supabase
        .from("warehouse_locations")
        .delete()
        .eq("warehouse_id", id);
      
      if (deleteError) throw deleteError;
      
      // Create new warehouse-location relations with updated primary location
      const warehouseLocations = locationIds.map((locationId) => ({
        warehouse_id: id as string,
        location_id: locationId,
        is_primary: locationId === primary_location_id,
      }));
      
      const { error: locationsError } = await supabase
        .from("warehouse_locations")
        .insert(warehouseLocations);
      
      if (locationsError) throw locationsError;
      
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses_with_locations"] });
      toast({
        title: "Success",
        description: "Warehouse updated successfully",
      });
      setIsOpen(false);
      setCurrentWarehouse(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update warehouse: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete warehouse mutation
  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      // Note: The warehouse locations will be automatically deleted due to the ON DELETE CASCADE constraint
      const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses_with_locations"] });
      toast({
        title: "Success",
        description: "Warehouse deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete warehouse: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Define form with enhanced locations support
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      description: "",
      manager_id: undefined,
      is_active: true,
      locations: [],
      primary_location_id: undefined,
    },
  });

  // State for managing primary location selection
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [primaryLocationId, setPrimaryLocationId] = useState<string | undefined>(undefined);

  // Watch for location changes to manage primary location
  const watchedLocations = form.watch("locations");
  
  useEffect(() => {
    setSelectedLocations(watchedLocations || []);
    // If primary location is not in selected locations, reset it
    if (primaryLocationId && !watchedLocations?.includes(primaryLocationId)) {
      setPrimaryLocationId(watchedLocations?.[0]);
      form.setValue("primary_location_id", watchedLocations?.[0]);
    }
    // If no primary location is set but locations exist, set the first one as primary
    else if (!primaryLocationId && watchedLocations?.length > 0) {
      setPrimaryLocationId(watchedLocations[0]);
      form.setValue("primary_location_id", watchedLocations[0]);
    }
  }, [watchedLocations, primaryLocationId, form]);
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setCurrentWarehouse(null);
      setSelectedLocations([]);
      setPrimaryLocationId(undefined);
    } else if (currentWarehouse) {
      // Find primary location
      const primaryLocation = currentWarehouse.locations.find(l => l.is_primary);
      const primaryLocationId = primaryLocation ? primaryLocation.id : currentWarehouse.locations[0]?.id;
      
      form.reset({
        id: currentWarehouse.id,
        name: currentWarehouse.name,
        description: currentWarehouse.description || "",
        manager_id: currentWarehouse.manager_id || "_none",
        is_active: currentWarehouse.is_active,
        locations: currentWarehouse.locations.map(l => l.id),
        primary_location_id: primaryLocationId,
      });
      
      setSelectedLocations(currentWarehouse.locations.map(l => l.id));
      setPrimaryLocationId(primaryLocationId);
    }
  }, [isOpen, currentWarehouse, form]);

  // Handle form submission
  const onSubmit = (values: WarehouseFormValues) => {
    // Ensure primary location is set
    if (values.locations.length > 0 && !values.primary_location_id) {
      values.primary_location_id = values.locations[0];
    }
    
    if (currentWarehouse) {
      updateWarehouse.mutate(values);
    } else {
      createWarehouse.mutate(values);
    }
  };

  // Set a location as primary
  const handleSetPrimaryLocation = (locationId: string) => {
    setPrimaryLocationId(locationId);
    form.setValue("primary_location_id", locationId);
  };

  // Handle edit warehouse
  const handleEdit = (warehouse: WarehouseWithLocations) => {
    setCurrentWarehouse(warehouse);
    setIsOpen(true);
  };

  // Handle delete confirmation
  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this warehouse?")) {
      deleteWarehouse.mutate(id);
    }
  };

  // Define table columns
  const columns = [
    {
      id: "name",
      header: "Name",
      cell: (row: WarehouseWithLocations) => <div className="font-medium">{row.name}</div>,
    },
    {
      id: "locations",
      header: "Locations",
      cell: (row: WarehouseWithLocations) => (
        <div className="flex flex-wrap gap-1">
          {row.locations.map((location) => (
            <Badge key={location.id} variant={location.is_primary ? "default" : "outline"}>
              {location.name} {location.is_primary && "(Primary)"}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "manager",
      header: "Manager",
      cell: (row: WarehouseWithLocations) => (
        <div>
          {row.manager ? (row.manager.full_name || row.manager.email) : "-"}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: WarehouseWithLocations) => (
        <Badge variant={row.is_active ? "default" : "destructive"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row: WarehouseWithLocations) => (
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

  // Fix the user mapping in the form
  const renderUserOptions = () => {
    return users.map((user: SupabaseUser) => (
      <SelectItem key={user.id} value={user.id}>
        {user.user_metadata?.full_name || user.email}
      </SelectItem>
    ));
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Warehouse Management"
        description="Manage your inventory warehouses and their locations"
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {currentWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
                </DialogTitle>
                <DialogDescription>
                  {currentWarehouse
                    ? "Update the warehouse details."
                    : "Create a new warehouse for your inventory."}
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
                          <Input placeholder="Enter warehouse name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter warehouse description"
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
                    name="manager_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warehouse Manager</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem key="no-manager" value="_none">None</SelectItem>
                            {renderUserOptions()}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locations"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel>Locations</FormLabel>
                          <FormDescription>
                            Select one or more locations for this warehouse.
                            Click the star icon to set a location as the primary location.
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          {locations.map((location) => (
                            <FormField
                              key={location.id}
                              control={form.control}
                              name="locations"
                              render={({ field }) => {
                                const isChecked = field.value?.includes(location.id);
                                const isPrimary = location.id === primaryLocationId;
                                
                                return (
                                  <div className="flex flex-row items-center justify-between p-2 rounded border border-gray-200">
                                    <FormItem
                                      key={location.id}
                                      className="flex flex-row items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            const updatedValue = checked
                                              ? [...field.value, location.id]
                                              : field.value.filter(
                                                  (value) => value !== location.id
                                                );
                                            field.onChange(updatedValue);
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {location.name}
                                      </FormLabel>
                                    </FormItem>
                                    
                                    {isChecked && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant={isPrimary ? "default" : "ghost"}
                                              className={`h-8 w-8 p-0 ${isPrimary ? "text-white" : "text-yellow-500"}`}
                                              onClick={() => handleSetPrimaryLocation(location.id)}
                                            >
                                              <Star className="h-4 w-4" fill={isPrimary ? "currentColor" : "none"} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {isPrimary ? "Primary Location" : "Set as Primary Location"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
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
                      {currentWarehouse ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoadingWarehouses ? (
            <div className="flex justify-center py-8">Loading warehouses...</div>
          ) : (
            <DataTable
              columns={columns}
              data={warehouses}
              emptyMessage="No warehouses found. Click 'Add Warehouse' to create one."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Warehouses;
