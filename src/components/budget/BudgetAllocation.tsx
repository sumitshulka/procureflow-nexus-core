import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BudgetCyclesManager from "./BudgetCyclesManager";
import BudgetHeadsManager from "./BudgetHeadsManager";
import BudgetSubmissions from "./BudgetSubmissions";
import BudgetReview from "./BudgetReview";
import ManagerBudgetDashboard from "./ManagerBudgetDashboard";

const BudgetAllocation = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cycles");

  // Fetch user context - roles and department
  const { data: userContext, isLoading: contextLoading } = useQuery({
    queryKey: ['budget-user-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id, custom_roles(name)')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      // Get user's department from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('department_id, departments(name)')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const isAdmin = roles?.some(r => ((r.custom_roles as any)?.name || '').toLowerCase() === 'admin');
      
      return {
        userId: user.id,
        isAdmin,
        departmentId: profile?.department_id,
        departmentName: (profile?.departments as any)?.name
      };
    }
  });

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = userContext?.isAdmin;
  const departmentId = userContext?.departmentId;
  const departmentName = userContext?.departmentName;

  // Non-admin users see the Manager Budget Dashboard
  if (!isAdmin) {
    if (!departmentId) {
      return (
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              Your profile is not assigned to a department. Please contact your administrator 
              to assign you to a department before you can manage budgets.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {departmentName && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-primary font-medium">
              Viewing budget for: <span className="font-semibold">{departmentName}</span>
            </p>
          </div>
        )}
        <ManagerBudgetDashboard 
          departmentId={departmentId} 
          departmentName={departmentName}
        />
      </div>
    );
  }

  // Admin users see the full admin interface with tabs
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cycles">Budget Cycles</TabsTrigger>
            <TabsTrigger value="heads">Budget Heads</TabsTrigger>
            <TabsTrigger value="review">Review Submissions</TabsTrigger>
            <TabsTrigger value="submissions">All Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="cycles">
            <BudgetCyclesManager />
          </TabsContent>

          <TabsContent value="heads">
            <BudgetHeadsManager />
          </TabsContent>

          <TabsContent value="review">
            <BudgetReview />
          </TabsContent>

          <TabsContent value="submissions">
            <BudgetSubmissions isAdmin={true} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default BudgetAllocation;
