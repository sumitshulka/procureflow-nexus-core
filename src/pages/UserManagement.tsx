
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import UsersList from "@/components/user-management/UsersList";
import RolesList from "@/components/user-management/RolesList";
import ApprovalHierarchy from "@/components/user-management/ApprovalHierarchy";
import { useNavigate, useLocation } from "react-router-dom";

const UserManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultTab = location.hash ? location.hash.replace('#', '') : 'users';

  const handleTabChange = (value: string) => {
    navigate(`/users#${value}`, { replace: true });
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="User Management" 
        description="Manage system users and their roles" 
      />
      
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="approval">Approval Hierarchy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <UsersList />
          </TabsContent>
          
          <TabsContent value="roles" className="mt-6">
            <RolesList />
          </TabsContent>
          
          <TabsContent value="approval" className="mt-6">
            <ApprovalHierarchy />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserManagement;
