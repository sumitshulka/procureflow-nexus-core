
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import MasterDataManagement from "@/components/settings/MasterDataManagement";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import EmailSettings from "@/components/settings/EmailSettings";
import IntegrationSettings from "@/components/settings/IntegrationSettings";
import RoleManagement from "@/components/settings/RoleManagement";
import LocationsManagement from "@/components/settings/LocationsManagement";
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
          <div className="border-b">
            <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="master-data" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                Master Data
              </TabsTrigger>
              <TabsTrigger 
                value="organization" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                Organization
              </TabsTrigger>
              <TabsTrigger 
                value="roles" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                Roles
              </TabsTrigger>
              <TabsTrigger 
                value="locations" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                Locations
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                Email
              </TabsTrigger>
              <TabsTrigger 
                value="integrations" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                Integrations
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="master-data" className="p-6">
            <MasterDataManagement />
          </TabsContent>
          
          <TabsContent value="organization" className="p-6">
            <OrganizationSettings />
          </TabsContent>
          
          <TabsContent value="roles" className="p-6">
            <RoleManagement />
          </TabsContent>
          
          <TabsContent value="locations" className="p-6">
            <LocationsManagement />
          </TabsContent>
          
          <TabsContent value="email" className="p-6">
            <EmailSettings />
          </TabsContent>
          
          <TabsContent value="integrations" className="p-6">
            <IntegrationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
