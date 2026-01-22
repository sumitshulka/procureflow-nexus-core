import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DepartmentInfo {
  id: string;
  name: string;
  assignedAt: string;
}

interface BudgetUserContext {
  userId: string | null;
  isAdmin: boolean;
  departments: DepartmentInfo[];
  primaryDepartmentId: string | null;
  primaryDepartmentName: string | null;
  isLoading: boolean;
  hasMultipleDepartments: boolean;
}

export const useBudgetUserContext = (): BudgetUserContext => {
  const { user, isLoading: authLoading } = useAuth();

  const { data: userContext, isLoading: contextLoading } = useQuery({
    queryKey: ['budget-user-context', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Get user roles to check if admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role_id, custom_roles(name)')
        .eq('user_id', user.id);
      
      const isAdmin = roles?.some(r => ((r.custom_roles as any)?.name || '').toLowerCase() === 'admin') || false;
      
      // Get active department assignments from the new table
      const { data: deptAssignments, error: deptError } = await supabase
        .from('user_department_assignments')
        .select('department_id, departments(id, name), assigned_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: true });

      if (deptError) {
        console.error('Error fetching department assignments:', deptError);
      }

      let departments: DepartmentInfo[] = [];
      
      if (deptAssignments && deptAssignments.length > 0) {
        departments = deptAssignments.map(da => ({
          id: (da.departments as any)?.id || da.department_id,
          name: (da.departments as any)?.name || 'Unknown',
          assignedAt: da.assigned_at
        }));
      } else {
        // Fallback to legacy department_id in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('department_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('id, name')
            .eq('id', profile.department_id)
            .maybeSingle();

          if (dept) {
            departments = [{
              id: dept.id,
              name: dept.name,
              assignedAt: ''
            }];
          }
        }
      }

      return {
        userId: user.id,
        isAdmin,
        departments
      };
    },
    enabled: !!user && !authLoading,
  });

  const isLoading = authLoading || contextLoading;
  const departments = userContext?.departments || [];
  const primaryDepartment = departments[0] || null;

  return {
    userId: userContext?.userId || null,
    isAdmin: userContext?.isAdmin ?? false,
    departments,
    primaryDepartmentId: primaryDepartment?.id || null,
    primaryDepartmentName: primaryDepartment?.name || null,
    isLoading,
    hasMultipleDepartments: departments.length > 1
  };
};

export default useBudgetUserContext;
