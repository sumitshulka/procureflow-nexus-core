import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BudgetCyclesManager from "./BudgetCyclesManager";
import BudgetHeadsManager from "./BudgetHeadsManager";
import BudgetSubmissions from "./BudgetSubmissions";
import BudgetReview from "./BudgetReview";

const BudgetAllocation = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cycles");

  // Check if user is admin
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    }
  });

  const isAdmin = userRoles?.some(r => r.role === 'admin');

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            {isAdmin && (
              <>
                <TabsTrigger value="cycles">Budget Cycles</TabsTrigger>
                <TabsTrigger value="heads">Budget Heads</TabsTrigger>
                <TabsTrigger value="review">Review Submissions</TabsTrigger>
              </>
            )}
            <TabsTrigger value="submissions">
              {isAdmin ? "All Submissions" : "My Submissions"}
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <>
              <TabsContent value="cycles">
                <BudgetCyclesManager />
              </TabsContent>

              <TabsContent value="heads">
                <BudgetHeadsManager />
              </TabsContent>

              <TabsContent value="review">
                <BudgetReview />
              </TabsContent>
            </>
          )}

          <TabsContent value="submissions">
            <BudgetSubmissions isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default BudgetAllocation;
