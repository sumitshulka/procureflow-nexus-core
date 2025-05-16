
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// Schema for approval hierarchy settings
const approvalSchema = z.object({
  roleLevel1: z.string().optional(),
  roleLevel2: z.string().optional(),
  roleLevel3: z.string().optional(),
});

type FormValues = z.infer<typeof approvalSchema>;

// Define interface for the settings data structure
interface ApprovalHierarchySettings {
  id?: string;
  level1_role?: string | null;
  level2_role?: string | null;
  level3_role?: string | null;
}

const ApprovalHierarchy = () => {
  console.info("Rendering ApprovalHierarchy component");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch roles for the dropdown
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles_for_approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("id, name");
        
      if (error) throw error;
      console.info("Roles fetched:", data);
      return data || [];
    },
  });

  // Fetch existing approval hierarchy settings
  const { data: hierarchySettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["approval_hierarchy"],
    queryFn: async () => {
      // Using a custom table or view for approval hierarchy settings
      const { data, error } = await supabase
        .from("approval_hierarchies")
        .select("*")
        .order('approver_level', { ascending: true });
        
      if (error) throw error;
      console.info("Raw approval hierarchies:", data);
      
      // Transform data to expected structure
      const settings: ApprovalHierarchySettings = {};
      
      // Map the data from approval_hierarchies to our expected structure
      if (data && data.length > 0) {
        data.forEach(entry => {
          if (entry.approver_level === 1) settings.level1_role = entry.approver_role;
          if (entry.approver_level === 2) settings.level2_role = entry.approver_role;
          if (entry.approver_level === 3) settings.level3_role = entry.approver_role;
        });
      }
      
      return settings;
    },
  });

  // Set up form with existing values
  const form = useForm<FormValues>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      roleLevel1: hierarchySettings?.level1_role || "",
      roleLevel2: hierarchySettings?.level2_role || "",
      roleLevel3: hierarchySettings?.level3_role || "",
    },
  });

  // Update form values when settings are loaded
  React.useEffect(() => {
    if (hierarchySettings) {
      form.reset({
        roleLevel1: hierarchySettings.level1_role || "",
        roleLevel2: hierarchySettings.level2_role || "",
        roleLevel3: hierarchySettings.level3_role || "",
      });
    }
  }, [hierarchySettings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log("Saving approval hierarchy:", values);
      
      // First, delete existing settings (simple approach for now)
      const { error: deleteError } = await supabase
        .from("approval_hierarchies")
        .delete()
        .not('id', 'is', null);
      
      if (deleteError) throw deleteError;
      
      // Insert new settings
      const hierarchiesToInsert = [];
      
      if (values.roleLevel1 && values.roleLevel1 !== "_none") {
        hierarchiesToInsert.push({
          approver_level: 1,
          approver_role: values.roleLevel1,
          department_id: '00000000-0000-0000-0000-000000000000' // Placeholder - should be updated to use proper department
        });
      }
      
      if (values.roleLevel2 && values.roleLevel2 !== "_none") {
        hierarchiesToInsert.push({
          approver_level: 2,
          approver_role: values.roleLevel2,
          department_id: '00000000-0000-0000-0000-000000000000' // Placeholder - should be updated to use proper department
        });
      }
      
      if (values.roleLevel3 && values.roleLevel3 !== "_none") {
        hierarchiesToInsert.push({
          approver_level: 3,
          approver_role: values.roleLevel3,
          department_id: '00000000-0000-0000-0000-000000000000' // Placeholder - should be updated to use proper department
        });
      }
      
      if (hierarchiesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("approval_hierarchies")
          .insert(hierarchiesToInsert);
        
        if (insertError) throw insertError;
      }
      
      return values;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_hierarchy"] });
      toast({
        title: "Settings saved",
        description: "Approval hierarchy has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving approval hierarchy:", error);
      toast({
        title: "Error saving settings",
        description: "There was a problem updating the approval hierarchy.",
        variant: "destructive",
      });
    },
  });
  
  // Save settings
  const onSubmit = (values: FormValues) => {
    saveSettingsMutation.mutate(values);
  };

  if (isLoading || isLoadingSettings) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Hierarchy</CardTitle>
        <CardDescription>
          Configure the approval levels for procurement requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="roleLevel1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level 1 Approver</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None (Skip this level)</SelectItem>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id || "_default_id"} // Ensure empty value is never provided
                            >
                              {role.name || "Unnamed Role"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleLevel2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level 2 Approver</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None (Skip this level)</SelectItem>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id || "_default_id"}
                            >
                              {role.name || "Unnamed Role"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleLevel3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level 3 Approver (Final)</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None (Skip this level)</SelectItem>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id || "_default_id"}
                            >
                              {role.name || "Unnamed Role"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Configuration
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ApprovalHierarchy;
