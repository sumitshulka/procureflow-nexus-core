import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ModulePermission {
  moduleId: string;
  moduleName: string;
  routePath: string | null;
  permission: string;
}

const getMenuItemRoutePath = (menuItems: any): string | null => {
  if (!menuItems) return null;
  // Supabase can return joined relations as an object or an array depending on the query shape
  if (Array.isArray(menuItems)) return menuItems[0]?.route_path ?? null;
  return menuItems.route_path ?? null;
};

// Mapping from UI routes to database module routes
// This allows the sidebar to use different paths than what's stored in the database
const uiToDbRouteMap: Record<string, string> = {
  '/products': '/catalog',
  '/reports': '/analytics',
};

const normalizeRoute = (route: string): string => {
  // Check for exact match first
  if (uiToDbRouteMap[route]) {
    return uiToDbRouteMap[route];
  }
  // Check for prefix match (e.g., /products/123 -> /catalog)
  for (const [uiRoute, dbRoute] of Object.entries(uiToDbRouteMap)) {
    if (route.startsWith(uiRoute + '/')) {
      return dbRoute;
    }
  }
  return route;
};

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
          routePath: getMenuItemRoutePath((mod as any).menu_items),
          permission: "admin",
        })) as ModulePermission[];
      }

      // Get permissions for user's roles
      const { data: rolePermissions, error: permError } = await supabase
        .from("role_permissions")
        .select("permission, module_uuid")
        .in("role_id", roleIds);

      if (permError) {
        console.error("Error fetching permissions:", permError);
        return [];
      }

      const moduleIds = Array.from(
        new Set(
          (rolePermissions || [])
            .map((rp: any) => rp.module_uuid)
            .filter(Boolean)
        )
      ) as string[];

      const { data: modules, error: modulesError } = await supabase
        .from("system_modules")
        .select("id, name, menu_item_id, menu_items!menu_item_id(route_path)")
        .in("id", moduleIds)
        .eq("is_active", true);

      if (modulesError) {
        console.error("Error fetching modules:", modulesError);
        return [];
      }

      const moduleById = new Map<
        string,
        { id: string; name: string; routePath: string | null }
      >();

      (modules || []).forEach((m: any) => {
        moduleById.set(m.id, {
          id: m.id,
          name: m.name,
          routePath: getMenuItemRoutePath(m.menu_items),
        });
      });

      // Deduplicate and get highest permission per module
      const permissionMap = new Map<string, ModulePermission>();
      const permissionPriority = ["view", "create", "edit", "delete", "admin"];

      (rolePermissions || []).forEach((rp: any) => {
        const module = moduleById.get(rp.module_uuid);
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
            routePath: module.routePath,
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

    // Normalize route to match database route
    const normalizedRoute = normalizeRoute(routePath);

    // Check if route matches any permitted module
    return permissions.some((p) => {
      if (!p.routePath) return false;
      // Match exact path or parent path
      return (
        normalizedRoute === p.routePath || 
        normalizedRoute.startsWith(p.routePath + "/") ||
        routePath === p.routePath ||
        routePath.startsWith(p.routePath + "/")
      );
    });
  };

  const getModulePermission = (routePath: string): string | null => {
    const normalizedRoute = normalizeRoute(routePath);
    const perm = permissions.find((p) => {
      if (!p.routePath) return false;
      return (
        normalizedRoute === p.routePath || 
        normalizedRoute.startsWith(p.routePath + "/") ||
        routePath === p.routePath ||
        routePath.startsWith(p.routePath + "/")
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
