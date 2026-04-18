
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import MasterDataManagement from "@/components/settings/MasterDataManagement";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import EmailSettings from "@/components/settings/EmailSettings";
import IntegrationSettings from "@/components/settings/IntegrationSettings";
import RoleManagement from "@/components/settings/RoleManagement";
import LocationsManagement from "@/components/settings/LocationsManagement";
import POSettings from "@/components/settings/POSettings";
import POApprovalMatrix from "@/components/settings/POApprovalMatrix";
import InvoiceApprovalMatrix from "@/components/settings/InvoiceApprovalMatrix";
import ApprovalHierarchy from "@/components/user-management/ApprovalHierarchy";
import MatchingSettings from "@/components/settings/MatchingSettings";
import { useNavigate, useLocation } from "react-router-dom";

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hashValue = location.hash ? location.hash.replace('#', '') : 'master-data';
  const [activeTab, setActiveTab] = useState(hashValue);

  // Update the URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/settings#${value}`, { replace: true });
  };

  // Log active tab for debugging
  useEffect(() => {
    console.log("Current active tab in Settings:", activeTab);
  }, [activeTab]);

  // Update the tab if the URL hash changes
  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.replace('#', '');
      setActiveTab(tab);
    }
  }, [location.hash]);

  return (
    <div className="page-container">
      <PageHeader 
        title="Settings" 
        description="Configure system settings and manage master data" 
      />
      
      <div className="bg-white rounded-lg border shadow-sm">
        <Tabs 
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="border-b overflow-x-auto">
            <TabsList className="h-12 w-max min-w-full justify-start rounded-none bg-transparent p-0 flex-nowrap">
              <TabsTrigger 
                value="master-data" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Master Data
              </TabsTrigger>
              <TabsTrigger 
                value="organization" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Organization
              </TabsTrigger>
              <TabsTrigger 
                value="roles" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Roles
              </TabsTrigger>
              <TabsTrigger 
                value="locations" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Locations
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Email
              </TabsTrigger>
              <TabsTrigger 
                value="integrations" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Integrations
              </TabsTrigger>
              <TabsTrigger 
                value="approvals" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Approval Settings
              </TabsTrigger>
              <TabsTrigger 
                value="purchase-orders" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Purchase Orders
              </TabsTrigger>
              <TabsTrigger 
                value="matching" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none whitespace-nowrap shrink-0"
              >
                Matching
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="master-data" className="p-4 sm:p-6">
            <MasterDataManagement />
          </TabsContent>
          
          <TabsContent value="organization" className="p-4 sm:p-6">
            <OrganizationSettings />
          </TabsContent>
          
          <TabsContent value="roles" className="p-4 sm:p-6">
            <RoleManagement />
          </TabsContent>
          
          <TabsContent value="locations" className="p-4 sm:p-6">
            <LocationsManagement />
          </TabsContent>
          
          <TabsContent value="email" className="p-4 sm:p-6">
            <EmailSettings />
          </TabsContent>
          
          <TabsContent value="integrations" className="p-4 sm:p-6">
            <IntegrationSettings />
          </TabsContent>
          
          <TabsContent value="approvals" className="p-4 sm:p-6">
            <Tabs defaultValue="procurement-approval" className="space-y-4">
              <div className="overflow-x-auto">
                <TabsList className="w-max min-w-full">
                  <TabsTrigger value="procurement-approval" className="whitespace-nowrap">Procurement Approval Hierarchy</TabsTrigger>
                  <TabsTrigger value="po-approval" className="whitespace-nowrap">PO Approval Matrix</TabsTrigger>
                  <TabsTrigger value="invoice-approval" className="whitespace-nowrap">Invoice Approval Matrix</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="procurement-approval">
                <ApprovalHierarchy />
              </TabsContent>
              <TabsContent value="po-approval">
                <POApprovalMatrix />
              </TabsContent>
              <TabsContent value="invoice-approval">
                <InvoiceApprovalMatrix />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="purchase-orders" className="p-4 sm:p-6">
            <POSettings />
          </TabsContent>
          
          <TabsContent value="matching" className="p-4 sm:p-6">
            <MatchingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
