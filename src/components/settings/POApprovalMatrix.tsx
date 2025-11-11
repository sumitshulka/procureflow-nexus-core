import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Users, DollarSign, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ApprovalLevel {
  id: string;
  level_number: number;
  level_name: string;
  min_amount: number;
  max_amount: number | null;
  description: string;
  is_active: boolean;
}

interface ApprovalMatrixItem {
  id: string;
  approval_level_id: string;
  department_id: string | null;
  approver_role: string | null;
  approver_user_id: string | null;
  sequence_order: number;
  department_name?: string;
  user_name?: string;
}

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  department_id: string | null;
}

const POApprovalMatrix = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);
  const [matrixItems, setMatrixItems] = useState<ApprovalMatrixItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(null);

  const [newLevel, setNewLevel] = useState({
    level_name: "",
    min_amount: "",
    max_amount: "",
    description: "",
  });

  const [newMatrixItems, setNewMatrixItems] = useState<Record<string, {
    department_id: string;
    approver_user_id: string;
  }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch approval levels
      const { data: levelsData, error: levelsError } = await supabase
        .from("po_approval_levels")
        .select("*")
        .order("level_number", { ascending: true });

      if (levelsError) throw levelsError;
      setLevels(levelsData || []);

      // Fetch approval matrix
      const { data: matrixData, error: matrixError } = await supabase
        .from("po_approval_matrix")
        .select(`
          *,
          departments(name),
          profiles(full_name)
        `)
        .order("sequence_order", { ascending: true });

      if (matrixError) throw matrixError;
      
      const formattedMatrix = (matrixData || []).map((item: any) => ({
        ...item,
        department_name: item.departments?.name,
        user_name: item.profiles?.full_name,
      }));
      setMatrixItems(formattedMatrix);

      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (deptError) throw deptError;
      setDepartments(deptData || []);

      // Fetch users with their departments (exclude vendor users)
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, department_id")
        .eq("is_vendor", false)
        .order("full_name");

      if (usersError) throw usersError;
      setUsers(usersData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLevel = async () => {
    if (!newLevel.level_name || !newLevel.min_amount) {
      toast({
        title: "Validation Error",
        description: "Level name and minimum amount are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const nextLevelNumber = Math.max(0, ...levels.map(l => l.level_number)) + 1;

      const { error } = await supabase
        .from("po_approval_levels")
        .insert({
          level_number: nextLevelNumber,
          level_name: newLevel.level_name,
          min_amount: parseFloat(newLevel.min_amount),
          max_amount: newLevel.max_amount ? parseFloat(newLevel.max_amount) : null,
          description: newLevel.description,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Approval level added successfully",
      });

      setNewLevel({
        level_name: "",
        min_amount: "",
        max_amount: "",
        description: "",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add approval level",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!confirm("Are you sure you want to delete this approval level? This will also remove all associated approvers.")) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("po_approval_levels")
        .delete()
        .eq("id", levelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Approval level deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete approval level",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddApprover = async (levelId: string) => {
    const matrixItem = newMatrixItems[levelId];
    if (!matrixItem?.approver_user_id) {
      toast({
        title: "Validation Error",
        description: "Please select an approver",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const maxSequence = Math.max(
        0,
        ...matrixItems
          .filter(m => m.approval_level_id === levelId)
          .map(m => m.sequence_order)
      );

      const { error } = await supabase
        .from("po_approval_matrix")
        .insert([{
          approval_level_id: levelId,
          department_id: matrixItem.department_id || null,
          approver_user_id: matrixItem.approver_user_id,
          sequence_order: maxSequence + 1,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Approver added successfully",
      });

      // Reset form for this level
      setNewMatrixItems(prev => ({
        ...prev,
        [levelId]: { department_id: "", approver_user_id: "" }
      }));
      
      setExpandedLevelId(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add approver",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateMatrixItem = (levelId: string, field: string, value: string) => {
    setNewMatrixItems(prev => {
      const currentItem = prev[levelId] || { department_id: "", approver_user_id: "" };
      const newItem = { ...currentItem, [field]: value };
      
      // Reset approver if department changes
      if (field === "department_id") {
        newItem.approver_user_id = "";
      }
      
      return {
        ...prev,
        [levelId]: newItem
      };
    });
  };

  const getFilteredUsers = (departmentId: string | undefined) => {
    if (!departmentId || departmentId === "" || departmentId === "any") {
      return users;
    }
    // Show users from selected department OR users with no department assigned
    return users.filter(user => user.department_id === departmentId || user.department_id === null);
  };

  const handleDeleteApprover = async (matrixId: string) => {
    if (!confirm("Are you sure you want to remove this approver?")) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("po_approval_matrix")
        .delete()
        .eq("id", matrixId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Approver removed successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove approver",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Approval Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configure Approval Levels
          </CardTitle>
          <CardDescription>
            Define approval levels based on purchase order amount thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="level_name">Level Name</Label>
              <Input
                id="level_name"
                value={newLevel.level_name}
                onChange={(e) => setNewLevel({ ...newLevel, level_name: e.target.value })}
                placeholder="e.g., Manager Approval"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="min_amount">Min Amount</Label>
              <Input
                id="min_amount"
                type="number"
                value={newLevel.min_amount}
                onChange={(e) => setNewLevel({ ...newLevel, min_amount: e.target.value })}
                placeholder="0"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="max_amount">Max Amount (Optional)</Label>
              <Input
                id="max_amount"
                type="number"
                value={newLevel.max_amount}
                onChange={(e) => setNewLevel({ ...newLevel, max_amount: e.target.value })}
                placeholder="Leave empty for unlimited"
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddLevel} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Level
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newLevel.description}
              onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })}
              placeholder="Describe when this approval level applies..."
              className="mt-2"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Approval Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Levels Overview</CardTitle>
          <CardDescription>Current configured approval levels and their thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No approval levels configured yet. Add your first level above.
            </p>
          ) : (
            <div className="space-y-4">
              {levels.map((level, index) => (
                <div key={level.id} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                          {level.level_number}
                        </span>
                        <h3 className="font-semibold text-lg">{level.level_name}</h3>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          ${level.min_amount.toLocaleString()} 
                          {level.max_amount ? ` - $${level.max_amount.toLocaleString()}` : " and above"}
                        </span>
                      </div>
                      {level.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{level.description}</p>
                      )}
                      
                      {/* Show approvers for this level */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Approvers</Label>
                          {expandedLevelId !== level.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpandedLevelId(level.id);
                                if (!newMatrixItems[level.id]) {
                                  setNewMatrixItems(prev => ({
                                    ...prev,
                                    [level.id]: { department_id: "", approver_user_id: "" }
                                  }));
                                }
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Approver
                            </Button>
                          )}
                        </div>
                        
                        {/* Add Approver Form - shown inline when expanded */}
                        {expandedLevelId === level.id && (
                          <div className="mb-3 p-3 border rounded-lg bg-background space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`dept-${level.id}`} className="text-xs">Department (Optional)</Label>
                                <Select
                                  value={newMatrixItems[level.id]?.department_id || ""}
                                  onValueChange={(value) => updateMatrixItem(level.id, "department_id", value)}
                                >
                                  <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any Department</SelectItem>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor={`approver-${level.id}`} className="text-xs">Approver *</Label>
                                <Select
                                  value={newMatrixItems[level.id]?.approver_user_id || ""}
                                  onValueChange={(value) => updateMatrixItem(level.id, "approver_user_id", value)}
                                >
                                  <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select approver" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getFilteredUsers(newMatrixItems[level.id]?.department_id).length === 0 ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No users in selected department
                                      </div>
                                    ) : (
                                      getFilteredUsers(newMatrixItems[level.id]?.department_id).map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {user.full_name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setExpandedLevelId(null);
                                  setNewMatrixItems(prev => ({
                                    ...prev,
                                    [level.id]: { department_id: "", approver_user_id: "" }
                                  }));
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleAddApprover(level.id)} 
                                disabled={isSaving}
                              >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                                Add
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* List of existing approvers */}
                        {matrixItems.filter(m => m.approval_level_id === level.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No approvers assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {matrixItems
                              .filter(m => m.approval_level_id === level.id)
                              .map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded border">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{item.user_name}</span>
                                    {item.department_name && (
                                      <span className="text-xs text-muted-foreground">({item.department_name})</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteApprover(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLevel(level.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {index < levels.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default POApprovalMatrix;
