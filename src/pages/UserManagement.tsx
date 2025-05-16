
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import UsersList from "@/components/user-management/UsersList";
import RolesList from "@/components/user-management/RolesList";

const UserManagement = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="User Management" 
        description="Manage system users and their roles" 
      />
      
      <div className="space-y-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <UsersList />
          </TabsContent>
          
          <TabsContent value="roles" className="mt-6">
            <RolesList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserManagement;
