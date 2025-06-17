
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import CustomReports from "@/components/analytics/CustomReports";

const CustomReportsPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Custom Reports" 
        description="Build and generate custom reports from your procurement data" 
      />
      
      <CustomReports />
    </div>
  );
};

export default CustomReportsPage;
