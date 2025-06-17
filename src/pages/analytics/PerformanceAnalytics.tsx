
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import PerformanceReports from "@/components/analytics/PerformanceReports";
import SpendAnalysis from "@/components/analytics/SpendAnalysis";
import VendorPerformance from "@/components/analytics/VendorPerformance";
import { useNavigate, useLocation } from "react-router-dom";

const PerformanceAnalytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultTab = location.hash ? location.hash.replace('#', '') : 'performance';

  const handleTabChange = (value: string) => {
    navigate(`/analytics/performance#${value}`, { replace: true });
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Performance Analytics" 
        description="Comprehensive analytics and reporting for procurement performance" 
      />
      
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
            <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
            <TabsTrigger value="vendor">Vendor Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="mt-6">
            <PerformanceReports />
          </TabsContent>
          
          <TabsContent value="spend" className="mt-6">
            <SpendAnalysis />
          </TabsContent>
          
          <TabsContent value="vendor" className="mt-6">
            <VendorPerformance />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
