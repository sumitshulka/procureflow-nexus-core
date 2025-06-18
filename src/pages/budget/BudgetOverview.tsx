
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import BudgetOverview from "@/components/budget/BudgetOverview";

const BudgetOverviewPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Budget Overview" 
        description="Monitor budget utilization and financial performance across departments and projects" 
      />
      
      <BudgetOverview />
    </div>
  );
};

export default BudgetOverviewPage;
