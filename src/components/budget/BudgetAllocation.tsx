import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BudgetCyclesManager from "./BudgetCyclesManager";
import BudgetHeadsManager from "./BudgetHeadsManager";
import BudgetAuditLog from "./BudgetAuditLog";
import BudgetReview from "./BudgetReview";
import ManagerBudgetDashboard from "./ManagerBudgetDashboard";
import { useBudgetUserContext } from "@/hooks/useBudgetUserContext";

const BudgetAllocation = () => {
  const [activeTab, setActiveTab] = useState("cycles");
  
  const { 
    isAdmin, 
    departments, 
    primaryDepartmentId, 
    primaryDepartmentName,
    hasMultipleDepartments,
    isLoading 
  } = useBudgetUserContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-admin users see the Manager Budget Dashboard
  if (!isAdmin) {
    if (departments.length === 0) {
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
        {!hasMultipleDepartments && primaryDepartmentName && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-primary font-medium">
              Viewing budget for: <span className="font-semibold">{primaryDepartmentName}</span>
            </p>
          </div>
        )}
        <ManagerBudgetDashboard 
          departments={departments}
          hasMultipleDepartments={hasMultipleDepartments}
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
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
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

          <TabsContent value="audit">
            <BudgetAuditLog />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default BudgetAllocation;
