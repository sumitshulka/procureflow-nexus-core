import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Copy, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

const Bootstrap = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checking, setChecking] = useState(true);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
          method: "GET",
        });
        if (!cancelled) {
          if (error) throw error;
          setAlreadyExists(Boolean((data as any)?.alreadyExists));
        }
      } catch (e) {
        // If status check fails, allow attempt; the POST itself is the source of truth.
        console.error(e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checking && alreadyExists && !result) {
      const t = setTimeout(() => navigate("/login", { replace: true }), 2500);
      return () => clearTimeout(t);
    }
  }, [checking, alreadyExists, result, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), fullName: fullName.trim() || undefined },
      });
      if (error) throw error;
      const payload = data as { success?: boolean; password?: string; user?: { email: string }; error?: string; alreadyExists?: boolean };
      if (payload?.alreadyExists) {
        setAlreadyExists(true);
        toast({ title: "Bootstrap disabled", description: "A Super Admin already exists.", variant: "destructive" });
        return;
      }
      if (!payload?.success || !payload.password || !payload.user) {
        throw new Error(payload?.error || "Failed to create Super Admin");
      }
      setResult({ email: payload.user.email, password: payload.password });
    } catch (err: any) {
      toast({
        title: "Bootstrap failed",
        description: err?.message || "Unable to create Super Admin",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.password);
    toast({ title: "Password copied to clipboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Bootstrap Super Admin</CardTitle>
          <CardDescription>
            One-time setup for the very first administrator account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {checking ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Checking setup status…
            </div>
          ) : result ? (
            <>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Super Admin created</AlertTitle>
                <AlertDescription>
                  Save this password now. It will <strong>not</strong> be shown again.
                  You must change it after your first login.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={result.email} readOnly />
              </div>

              <div className="space-y-2">
                <Label>One-time password</Label>
                <div className="flex gap-2">
                  <Input value={result.password} readOnly className="font-mono" />
                  <Button type="button" variant="outline" onClick={copyPassword}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
            </>
          ) : alreadyExists ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Bootstrap disabled</AlertTitle>
              <AlertDescription>
                A Super Admin already exists for this installation. Redirecting to login…
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name (optional)</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourcompany.com"
                  required
                  maxLength={255}
                />
              </div>
              <Alert>
                <AlertDescription className="text-xs">
                  This page is only available until the first Super Admin is created.
                  A one-time random password will be generated and shown once.
                </AlertDescription>
              </Alert>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  "Create Super Admin"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Bootstrap;
