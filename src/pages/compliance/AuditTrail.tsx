
import React from "react";
import PageHeader from "@/components/common/PageHeader";
import AuditTrail from "@/components/compliance/AuditTrail";

const AuditTrailPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Audit Trail" 
        description="Track all system activities and maintain comprehensive audit logs" 
      />
      
      <AuditTrail />
    </div>
  );
};

export default AuditTrailPage;
