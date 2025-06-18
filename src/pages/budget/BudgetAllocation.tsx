
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import BudgetAllocation from "@/components/budget/BudgetAllocation";

const BudgetAllocationPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Budget Allocation" 
        description="Allocate and manage budgets across departments, projects, and categories" 
      />
      
      <BudgetAllocation />
    </div>
  );
};

export default BudgetAllocationPage;
