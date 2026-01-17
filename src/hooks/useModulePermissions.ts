import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ModulePermission {
  moduleId: string;
  moduleName: string;
  routePath: string | null;
  permission: string;
}

export const useModulePermissions = () => {
  const { user, userData } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user_module_permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's role IDs
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id);

      if (rolesError || !userRoles?.length) {
        console.log("No roles found for user");
        return [];
      }

      const roleIds = userRoles.map((r) => r.role_id);

      // Check if user has Admin role (case-insensitive)
      const { data: adminRoles } = await supabase
        .from("custom_roles")
        .select("id, name")
        .in("id", roleIds);

      const isAdmin = adminRoles?.some(
        (role) => role.name.toLowerCase() === "admin"
      );

      // If admin, return all modules with admin permission
      if (isAdmin) {
        const { data: allModules } = await supabase
          .from("system_modules")
          .select("id, name, menu_item_id, menu_items!menu_item_id(route_path)")
          .eq("is_active", true);

        return (allModules || []).map((mod) => ({
          moduleId: mod.id,
          moduleName: mod.name,
          routePath: (mod.menu_items as any)?.route_path || null,
          permission: "admin",
        })) as ModulePermission[];
      }

      // Get permissions for user's roles
      const { data: rolePermissions, error: permError } = await supabase
        .from("role_permissions")
        .select(
          `
          permission,
          module_uuid,
          system_modules!module_uuid(
            id,
            name,
            menu_item_id,
            menu_items!menu_item_id(route_path)
          )
        `
        )
        .in("role_id", roleIds);

      if (permError) {
        console.error("Error fetching permissions:", permError);
        return [];
      }

      // Deduplicate and get highest permission per module
      const permissionMap = new Map<string, ModulePermission>();
      const permissionPriority = ["view", "create", "edit", "delete", "admin"];

      (rolePermissions || []).forEach((rp: any) => {
        const module = rp.system_modules;
        if (!module) return;

        const existing = permissionMap.get(module.id);
        const currentPriority = permissionPriority.indexOf(rp.permission);
        const existingPriority = existing
          ? permissionPriority.indexOf(existing.permission)
          : -1;

        if (currentPriority > existingPriority) {
          permissionMap.set(module.id, {
            moduleId: module.id,
            moduleName: module.name,
            routePath: module.menu_items?.route_path || null,
            permission: rp.permission,
          });
        }
      });

      return Array.from(permissionMap.values());
    },
    enabled: !!user?.id,
  });

  const hasModuleAccess = (routePath: string): boolean => {
    // Check if user has any role that's "Admin" (case-insensitive)
    const userRolesLower = userData?.roles?.map((r) => r.toLowerCase()) || [];
    if (userRolesLower.includes("admin")) {
      return true;
    }

    // Check if route matches any permitted module
    return permissions.some((p) => {
      if (!p.routePath) return false;
      // Match exact path or parent path
      return (
        routePath === p.routePath || routePath.startsWith(p.routePath + "/")
      );
    });
  };

  const getModulePermission = (routePath: string): string | null => {
    const perm = permissions.find((p) => {
      if (!p.routePath) return false;
      return (
        routePath === p.routePath || routePath.startsWith(p.routePath + "/")
      );
    });
    return perm?.permission || null;
  };

  return {
    permissions,
    isLoading,
    hasModuleAccess,
    getModulePermission,
  };
};
