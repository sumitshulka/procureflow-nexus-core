
import { useState } from "react";
import { Link } from "react-router-dom";
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

const UpdatePasswordPage = () => {
  const { updatePassword, isLoading } = useAuth();
  
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  
  const [passwordError, setPasswordError] = useState("");

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
    
    if (passwords.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswords()) return;
    
    await updatePassword(passwords.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-procurement-600">Procurement</span> Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Set your new password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>
              Enter a new password for your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={passwords.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  required
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
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
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
