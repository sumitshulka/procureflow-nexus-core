
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import PolicyManagement from "@/components/compliance/PolicyManagement";

const PolicyManagementPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Policy Management" 
        description="Manage organizational policies, procedures, and compliance requirements" 
      />
      
      <PolicyManagement />
    </div>
  );
};

export default PolicyManagementPage;
