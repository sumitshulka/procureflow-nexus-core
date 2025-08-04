
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Session, User } from "@supabase/supabase-js";
import { UserRole } from "@/types";

interface UserData {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  department?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, makeAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AuthContext: Setting up auth state management");
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change event:", event);
        
        if (event === 'SIGNED_OUT') {
          // When signed out, clear all auth state
          setSession(null);
          setUser(null);
          setUserData(null);
          setIsLoading(false);
        } else if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Use setTimeout to avoid recursive Supabase auth calls
          if (newSession.user) {
            setTimeout(() => {
              fetchUserData(newSession.user.id);
            }, 0);
          }
        } else {
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log("Checking for existing session");
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", existingSession ? "Session exists" : "No session");
        
        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);
          await fetchUserData(existingSession.user.id);
        } else {
          setIsLoading(false);
        }
        
        setAuthInitialized(true);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log("Fetching user data for:", userId);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;
      
      // Check if user is a vendor
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      console.log("Roles retrieved from DB:", rolesData);
      console.log("Vendor registration found:", vendorData ? "Yes" : "No");

      const userData = {
        id: userId,
        email: user?.email || "",
        fullName: profileData?.full_name,
        avatarUrl: profileData?.avatar_url,
        department: profileData?.department,
        roles: rolesData.map(r => r.role as UserRole),
      };
      
      console.log("Setting userData to:", userData);
      setUserData(userData);
      
      // Navigate based on vendor status or role after login
      if (vendorData) {
        console.log("Navigating to vendor dashboard");
        navigate('/vendor-dashboard');
      } else if (rolesData.length > 0) {
        const userRole = rolesData[0].role;
        if (userRole === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('[AuthContext] Login error:', error);
        // Log failed login attempt
        await logSecurityEvent(null, 'login_failed', { 
          email,
          error: error.message,
          user_agent: navigator.userAgent 
        }, null, null, false);
        throw error;
      }
      
      console.log("Login successful, session:", data.session);

      // Log successful login
      if (data.user) {
        await logSecurityEvent(data.user.id, 'login_success', { 
          email,
          user_agent: navigator.userAgent 
        });
        
        // Log the user activity (legacy)
        await logUserActivity("login");
      }
      
      // Navigation will happen after user data is fetched in the effect
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      throw error; // Re-throw the error so the login page can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, makeAdmin: boolean = false) => {
    try {
      setIsLoading(true);

      // Validate password strength using database function
      const { data: passwordCheck, error: passwordError } = await supabase.rpc('validate_password_strength', {
        password: password
      });

      if (passwordError) {
        console.error('[AuthContext] Password validation error:', passwordError);
        throw new Error('Password validation failed');
      }

      // Type guard for the password validation response
      const validationResult = passwordCheck as { valid: boolean; errors?: string[] } | null;
      
      if (!validationResult?.valid) {
        const errors = validationResult?.errors || ['Password does not meet security requirements'];
        throw new Error(errors.join(', '));
      }
      
      // Check if this is the first user signing up
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (countError) throw countError;
      
      // If no users exist or makeAdmin is true, this user will be an admin
      const shouldMakeAdmin = makeAdmin || count === 0;
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        // Log failed signup attempt
        await logSecurityEvent(null, 'signup_failed', { 
          email,
          error: error.message,
          user_agent: navigator.userAgent 
        }, null, null, false);
        throw error;
      }

      // Log successful signup
      if (data.user) {
        await logSecurityEvent(data.user.id, 'signup_success', { 
          email,
          user_agent: navigator.userAgent 
        });

        // If automatic setup is completed and user is already created
        if (shouldMakeAdmin) {
          // Assign admin role manually
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: 'admin'
            });
            
          if (roleError) throw roleError;
          
          await logSecurityEvent(data.user.id, 'admin_role_assigned', { email });
          
          toast({
            title: "Admin account created",
            description: "You have been assigned the admin role.",
          });
        } else {
          toast({
            title: "Account created",
            description: "Please check your email for the confirmation link.",
          });
        }
      }
      
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during signup.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Log activity before signing out
      if (user) {
        await logUserActivity("logout");
        // Log security event
        await logSecurityEvent(user.id, 'logout', { 
          user_agent: navigator.userAgent 
        });
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear user data
      setSession(null);
      setUser(null);
      setUserData(null);
      
      // Always navigate to login page after successful logout
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for the reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
      
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logUserActivity = async (action: string, details?: any) => {
    if (!user) return;
    
    try {
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action,
          details,
        });
    } catch (error) {
      console.error("Failed to log user activity:", error);
    }
  };

  // Helper function to log security events
  const logSecurityEvent = async (
    userId: string | null, 
    eventType: string, 
    eventData: any = {}, 
    ipAddress: string | null = null, 
    userAgent: string | null = null, 
    success: boolean = true
  ) => {
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: userId,
        p_event_type: eventType,
        p_event_data: eventData,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_success: success
      });
    } catch (error) {
      console.error('[AuthContext] Failed to log security event:', error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    if (!userData) return false;
    return userData.roles.includes(role);
  };

  const value = {
    session,
    user,
    userData,
    isLoading: isLoading || !authInitialized,
    login,
    signUp,
    logout,
    resetPassword,
    updatePassword,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
