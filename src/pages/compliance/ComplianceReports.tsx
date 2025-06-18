
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import ComplianceReports from "@/components/compliance/ComplianceReports";

const ComplianceReportsPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Compliance Reports" 
        description="Generate compliance reports and monitor regulatory adherence" 
      />
      
      <ComplianceReports />
    </div>
  );
};

export default ComplianceReportsPage;
