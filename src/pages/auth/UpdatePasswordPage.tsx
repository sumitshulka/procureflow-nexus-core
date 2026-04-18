import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const UpdatePasswordPage = () => {
  const { updatePassword, isLoading } = useAuth();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [isRecoverySession, setIsRecoverySession] = useState<boolean | null>(null);

  // Detect recovery flow: Supabase puts a recovery token in the URL hash and
  // emits a PASSWORD_RECOVERY event. We accept either signal, plus an existing
  // authenticated session (e.g. user already logged in changing password).
  useEffect(() => {
    let resolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolved = true;
        setIsRecoverySession(true);
      }
    });

    const checkSession = async () => {
      const hash = window.location.hash || "";
      const hasRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");

      const { data: { session } } = await supabase.auth.getSession();

      if (resolved) return;

      if (session || hasRecoveryHash) {
        setIsRecoverySession(true);
      } else {
        setIsRecoverySession(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    setPasswordError("");
  };

  const validatePasswords = () => {
    if (passwords.password !== passwords.confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    if (passwords.password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswords()) return;

    try {
      await updatePassword(passwords.password);
      // Sign out so the user must log in with the new password
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({
        title: "Could not update password",
        description: err?.message || "Please request a new reset link and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-procurement-600">Procurement</span> Management
          </h1>
          <p className="text-muted-foreground mt-2">Set your new password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>
              {isRecoverySession === false
                ? "This link is invalid or has expired."
                : "Enter a new password for your account"}
            </CardDescription>
          </CardHeader>

          {isRecoverySession === false ? (
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Password reset links are single-use and expire after a short time.
                Please request a new one.
              </p>
              <Button
                asChild
                className="w-full bg-procurement-600 hover:bg-procurement-700"
              >
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-procurement-600 hover:bg-procurement-700"
                  disabled={isLoading || isRecoverySession === null}
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="text-procurement-600 hover:text-procurement-500">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
