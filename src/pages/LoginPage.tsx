
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { UserRole } from "@/types";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
    remember: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setCredentials((prev) => ({ ...prev, remember: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate login success for demo purposes
      localStorage.setItem("user", JSON.stringify({
        id: "user-123",
        name: "Demo User",
        email: credentials.email,
        role: UserRole.ADMIN,
      }));

      toast.success("Login successful! Welcome to the Procurement Management System.");
      uiToast({
        title: "Login successful!",
        description: "Welcome to the Procurement Management System.",
      });
      
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Login failed. Please check your credentials and try again.");
      uiToast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-procurement-600">Procurement</span> Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access your procurement dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={credentials.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="text-sm text-procurement-600 hover:text-procurement-500"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={credentials.remember}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Remember me for 30 days
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-procurement-600 hover:bg-procurement-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a href="#" className="text-procurement-600 hover:text-procurement-500">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
