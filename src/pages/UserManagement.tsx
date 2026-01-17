import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import UsersList from "@/components/user-management/UsersList";
import EnhancedRolesList from "@/components/user-management/EnhancedRolesList";
import UserRoleAssignment from "@/components/user-management/UserRoleAssignment";
import { useNavigate, useLocation } from "react-router-dom";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const UserManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getModulePermission } = useModulePermissions();
  const defaultTab = location.hash ? location.hash.replace('#', '') : 'users';

  // Check permission level for current user
  const permission = getModulePermission('/users');
  const canManageRoles = permission === 'admin' || permission === 'edit';

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
            {canManageRoles && (
              <>
                <TabsTrigger value="roles">Roles & Modules</TabsTrigger>
                <TabsTrigger value="assignments">Role Assignments</TabsTrigger>
              </>
            )}
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <UsersList />
          </TabsContent>
          
          {canManageRoles && (
            <>
              <TabsContent value="roles" className="mt-6">
                <EnhancedRolesList />
              </TabsContent>
              
              <TabsContent value="assignments" className="mt-6">
                <UserRoleAssignment />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default UserManagement;
