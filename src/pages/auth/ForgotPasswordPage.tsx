
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

const ForgotPasswordPage = () => {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resetPassword(email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-procurement-600">Procurement</span> Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Reset your password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              {!submitted 
                ? "Enter your email and we'll send you a link to reset your password"
                : "Check your email for a password reset link"}
            </CardDescription>
          </CardHeader>
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-procurement-600 hover:bg-procurement-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent>
              <div className="text-center py-4">
                <p>
                  If an account exists with {email}, you will receive an email with a password reset link.
                </p>
              </div>
            </CardContent>
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

export default ForgotPasswordPage;
