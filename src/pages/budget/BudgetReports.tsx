
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import BudgetReports from "@/components/budget/BudgetReports";

const BudgetReportsPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Budget Reports" 
        description="Generate comprehensive budget reports and variance analysis" 
      />
      
      <BudgetReports />
    </div>
  );
};

export default BudgetReportsPage;
