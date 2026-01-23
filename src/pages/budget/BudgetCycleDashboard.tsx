import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BudgetCycleDashboardView from "@/components/budget/BudgetCycleDashboardView";

const BudgetCycleDashboard = () => {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();

  if (!cycleId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No budget cycle selected.</p>
        <Button variant="outline" onClick={() => navigate("/budget/allocation")}>
          Back to Budget Allocation
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/budget/allocation")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cycles
        </Button>
      </div>
      <BudgetCycleDashboardView cycleId={cycleId} />
    </div>
  );
};

export default BudgetCycleDashboard;
