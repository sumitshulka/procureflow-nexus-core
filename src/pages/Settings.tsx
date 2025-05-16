
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import MasterDataManagement from "@/components/settings/MasterDataManagement";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import UserManagement from "@/components/settings/UserManagement";
import EmailSettings from "@/components/settings/EmailSettings";
import IntegrationSettings from "@/components/settings/IntegrationSettings";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("master-data");

  return (
    <div className="page-container">
      <PageHeader 
        title="Settings" 
        description="Configure system settings and manage master data" 
      />
      
      <div className="bg-white rounded-lg border shadow-sm">
        <Tabs 
          defaultValue="master-data" 
          onValueChange={setActiveTab}
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
                value="users" 
                className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent px-4 py-3 rounded-none"
              >
                User Management
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
          
          <TabsContent value="users" className="p-6">
            <UserManagement />
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
