
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import SpendAnalysis from "@/components/analytics/SpendAnalysis";

const SpendAnalysisPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Spend Analysis" 
        description="Analyze spending patterns and trends across your organization" 
      />
      
      <SpendAnalysis />
    </div>
  );
};

export default SpendAnalysisPage;
