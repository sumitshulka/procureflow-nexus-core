
import React, { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import UsersList from "@/components/user-management/UsersList";
import EnhancedRolesList from "@/components/user-management/EnhancedRolesList";
import UserRoleAssignment from "@/components/user-management/UserRoleAssignment";
import ApprovalHierarchy from "@/components/user-management/ApprovalHierarchy";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

const UserManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const defaultTab = location.hash ? location.hash.replace('#', '') : 'users';

  // Check if user has admin permission
  useEffect(() => {
    if (userData && !userData.roles?.includes(UserRole.ADMIN)) {
      navigate('/dashboard', { replace: true });
    }
  }, [userData, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/users#${value}`, { replace: true });
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="User Management" 
        description="Manage system users, roles, and permissions" 
      />
      
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles & Modules</TabsTrigger>
            <TabsTrigger value="assignments">Role Assignments</TabsTrigger>
            <TabsTrigger value="approval">Approval Hierarchy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <UsersList />
          </TabsContent>
          
          <TabsContent value="roles" className="mt-6">
            <EnhancedRolesList />
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-6">
            <UserRoleAssignment />
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
