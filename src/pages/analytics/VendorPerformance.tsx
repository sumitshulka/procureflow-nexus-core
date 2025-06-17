
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import VendorPerformance from "@/components/analytics/VendorPerformance";

const VendorPerformancePage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Vendor Performance" 
        description="Monitor and evaluate vendor performance metrics and KPIs" 
      />
      
      <VendorPerformance />
    </div>
  );
};

export default VendorPerformancePage;
