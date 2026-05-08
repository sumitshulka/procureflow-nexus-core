import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Building2, Phone, IdCard, Save } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const Profile = () => {
  const { user, userData } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isPending } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, departments:department_id(name)")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const [form, setForm] = useState({ full_name: "", mobile: "", employee_id: "", avatar_url: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        mobile: profile.mobile || "",
        employee_id: profile.employee_id || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          mobile: form.mobile,
          employee_id: form.employee_id,
          avatar_url: form.avatar_url,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Your profile has been saved." });
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const initials = (form.full_name || userData?.email || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="container mx-auto p-6 space-y-6 text-left">
      <PageHeader title="My Profile" description="View and update your personal information" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24">
                {form.avatar_url && <AvatarImage src={form.avatar_url} />}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-semibold text-lg">{profile?.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                  <Mail className="h-3 w-3" /> {userData?.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {(userData?.roles || []).map((r) => (
                  <Badge key={r} variant="secondary">{r}</Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{profile?.departments?.name || profile?.department || "No department"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <IdCard className="h-4 w-4" />
                <span>{profile?.employee_id || "No employee ID"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{profile?.mobile || "No phone"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={userData?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input id="employee_id" value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input id="avatar_url" value={form.avatar_url} placeholder="https://…"
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={profile?.departments?.name || profile?.department || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={profile?.status || "active"} disabled />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
