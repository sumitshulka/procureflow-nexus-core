
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, LogIn, ArrowRight, Building } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const { login, isLoading, user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state or default to "/"
  const from = location.state?.from || "/";
  const redirectPath = sessionStorage.getItem('redirectPath') || from;
  
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  // Check if authenticated user is a vendor to redirect correctly
  const { data: isVendorUser, isLoading: vendorCheckLoading } = useQuery({
    queryKey: ["login_vendor_check", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return !error && !!data;
    },
    enabled: !!user?.id,
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isLoading && user && session && !redirected && !vendorCheckLoading) {
      const destination = isVendorUser ? '/vendor-dashboard' : redirectPath;
      console.log("User already authenticated, redirecting to:", destination);
      setRedirected(true);
      navigate(destination, { replace: true });
    }
  }, [user, session, navigate, redirectPath, isLoading, redirected, isVendorUser, vendorCheckLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (loginError) setLoginError(null);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setCredentials((prev) => ({ ...prev, remember: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    try {
      await login(credentials.email, credentials.password);
      // Don't navigate here - the useEffect will handle it once user state updates
      console.log("Login successful, waiting for auth state to update");
    } catch (error: any) {
      const errorMessage = error?.message || "An error occurred during login";
      setLoginError(errorMessage);
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If already authenticated and we've triggered a redirect, show loading
  if (!isLoading && user && session && redirected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-procurement-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left section - Decorative side */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-procurement-600 to-procurement-800 text-white p-12 flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            Procurement Management System
          </h1>
          <p className="text-lg mb-8 text-procurement-100">
            Streamline your procurement process with our powerful platform. 
            Manage requests, track orders, and optimize your supply chain in one place.
          </p>
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm border border-white/20">
            <p className="italic mb-4">
              "This platform has transformed how we handle procurement across our organization. It's intuitive and powerful."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-procurement-100 text-procurement-700 flex items-center justify-center font-bold mr-3">
                JS
              </div>
              <div>
                <p className="font-medium">Jane Smith</p>
                <p className="text-sm text-procurement-100">Procurement Director</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right section - Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-8 md:py-0 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome Back
            </h2>
            <p className="text-gray-600 mt-2">
              Please sign in to your account
            </p>
          </div>

          <Card className="shadow-md border-0">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Sign In</CardTitle>
                <div className="h-10 w-10 rounded-full bg-procurement-100 flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-procurement-600" />
                </div>
              </div>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {loginError && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    {loginError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@company.com"
                    value={credentials.email}
                    onChange={handleChange}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-procurement-600 hover:text-procurement-500 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={handleChange}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? 
                        <EyeOff className="h-5 w-5" /> : 
                        <Eye className="h-5 w-5" />
                      }
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={credentials.remember}
                    onCheckedChange={handleCheckboxChange}
                    className="data-[state=checked]:bg-procurement-600 data-[state=checked]:border-procurement-600"
                  />
                  <label 
                    htmlFor="remember" 
                    className="text-sm text-gray-600 font-normal cursor-pointer select-none"
                  >
                    Remember me for 30 days
                  </label>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full h-11 bg-procurement-600 hover:bg-procurement-700 transition-all duration-300 group"
                  disabled={isLoading}
                >
                  <span className="mr-1">{isLoading ? "Signing In..." : "Sign In"}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="text-center mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-procurement-600 hover:text-procurement-500 hover:underline">
                Create an account
              </Link>
            </p>
            
            {/* Vendor Registration Link */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Are you a vendor?
              </p>
              <Link to="/vendor-registration">
                <Button
                  variant="outline"
                  className="w-full h-11 border-procurement-600 text-procurement-600 hover:bg-procurement-50 transition-all duration-300 group"
                >
                  <Building className="h-4 w-4 mr-2" />
                  <span className="mr-1">Register as Vendor</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
