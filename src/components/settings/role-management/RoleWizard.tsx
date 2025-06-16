
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Step schemas
const createRoleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

const RoleWizard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(3);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({});
  const [modulePermissions, setModulePermissions] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for step 1
  const roleForm = useForm({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch modules with menu item info
  const { data: modules = [], isLoading: modulesLoading, error: modulesError } = useQuery({
    queryKey: ["system_modules_wizard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_modules")
        .select(`
          *,
          menu_item:menu_item_id(name, route_path)
        `)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof createRoleSchema>) => {
      const { data, error } = await supabase
        .from("custom_roles")
        .insert({
          name: values.name,
          description: values.description || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setRoleId(data.id);
      toast({
        title: "Role created",
        description: "The role has been created. Now select modules for this role.",
      });
      setCurrentStep(2);
    },
    onError: (error) => {
      toast({
        title: "Error creating role",
        description: error.message || "There was a problem creating the role",
        variant: "destructive",
      });
    },
  });

  // Save module permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!roleId) return null;
      
      // Prepare permissions to save
      const permissionsToSave: { role_id: string; module_id: string; module_uuid: string; permission: string }[] = [];
      
      Object.entries(selectedModules).forEach(([moduleId, isSelected]) => {
        if (isSelected && modulePermissions[moduleId]) {
          modulePermissions[moduleId].forEach(permission => {
            permissionsToSave.push({
              role_id: roleId,
              module_id: "legacy", // Keep for backward compatibility
              module_uuid: moduleId,
              permission: permission,
            });
          });
        }
      });

      if (permissionsToSave.length === 0) {
        throw new Error("No permissions selected");
      }
      
      const { error } = await supabase
        .from("role_permissions")
        .insert(permissionsToSave);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_roles"] });
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
      toast({
        title: "Role setup complete",
        description: "The role has been successfully configured with the selected permissions.",
      });
      setCurrentStep(3);
    },
    onError: (error) => {
      toast({
        title: "Error saving permissions",
        description: error.message || "There was a problem saving the permissions",
        variant: "destructive",
      });
    },
  });
  
  // Handle step 1 submission - Create role
  const onSubmitRole = (values: z.infer<typeof createRoleSchema>) => {
    createRoleMutation.mutate(values);
  };

  // Handle step 2 - Select modules
  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Handle step 3 - Configure permissions
  const togglePermission = (moduleId: string, permission: string) => {
    setModulePermissions(prev => {
      const currentPermissions = prev[moduleId] || [];
      const updatedPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter(p => p !== permission)
        : [...currentPermissions, permission];
      
      return {
        ...prev,
        [moduleId]: updatedPermissions,
      };
    });
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep === 2) {
      // Validate that at least one module is selected
      if (Object.values(selectedModules).some(selected => selected)) {
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      } else {
        toast({
          title: "Select at least one module",
          description: "Please select at least one module to continue",
          variant: "destructive",
        });
      }
    } else {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Finish wizard and save all data
  const finishSetup = () => {
    setIsSubmitting(true);
    savePermissionsMutation.mutate();
  };

  // Reset wizard
  const startNewRole = () => {
    roleForm.reset();
    setRoleId(null);
    setSelectedModules({});
    setModulePermissions({});
    setCurrentStep(1);
  };

  // Available permissions
  const availablePermissions = [
    { id: "view", name: "View", description: "Can view the module" },
    { id: "create", name: "Create", description: "Can create new items" },
    { id: "edit", name: "Edit", description: "Can modify existing items" },
    { id: "delete", name: "Delete", description: "Can delete items" },
    { id: "admin", name: "Full Control", description: "Complete access to the module" },
  ];

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(onSubmitRole)} className="space-y-4">
              <FormField
                control={roleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a clear, descriptive name for this role.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose and responsibilities of this role" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                >
                  {createRoleMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Select which modules this role should have access to:
            </div>
            
            {modulesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : modules.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                No modules found. Please create system modules first.
              </div>
            ) : (
              <div className="grid gap-4">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-start space-x-3 p-3 border rounded-md">
                    <Checkbox 
                      id={`module-${module.id}`} 
                      checked={selectedModules[module.id] || false}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={`module-${module.id}`} 
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        {module.name}
                        {module.menu_item && (
                          <Badge variant="outline" className="text-xs">
                            {module.menu_item.route_path}
                          </Badge>
                        )}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {module.description || 'No description available'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={modulesLoading || !Object.values(selectedModules).some(selected => selected)}
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        const selectedModulesList = modules.filter(m => selectedModules[m.id]);
        
        return (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Configure permissions for each selected module:
            </div>
            
            {selectedModulesList.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No modules selected. Go back to select modules.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                {selectedModulesList.map((module) => (
                  <div key={module.id} className="border rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium">{module.name || "Unnamed Module"}</h4>
                      {module.menu_item && (
                        <Badge variant="outline" className="text-xs">
                          {module.menu_item.route_path}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {availablePermissions.map(permission => (
                        <div key={`${module.id}-${permission.id}`} className="flex items-start space-x-3 p-2 border rounded">
                          <Checkbox 
                            id={`perm-${module.id}-${permission.id}`}
                            checked={(modulePermissions[module.id] || []).includes(permission.id)}
                            onCheckedChange={() => togglePermission(module.id, permission.id)}
                          />
                          <div>
                            <label
                              htmlFor={`perm-${module.id}-${permission.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {permission.name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={finishSetup}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finish Setup
              </Button>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto rounded-full bg-green-100 w-12 h-12 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Role Setup Complete</h3>
            <p className="text-muted-foreground">
              You've successfully created and configured the role.
            </p>
            <Button
              type="button"
              onClick={startNewRole}
              className="mt-4"
            >
              Create Another Role
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Role Creation Wizard</CardTitle>
            <CardDescription>
              Create and configure a new role in the system
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium">Step {currentStep}</span>
            <span className="text-muted-foreground">of {totalSteps}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6 w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
        
        {renderStepContent()}
      </CardContent>
    </Card>
  );
};

export default RoleWizard;
