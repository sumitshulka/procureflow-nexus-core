import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Building, FileText, Upload, User, CreditCard, Phone, Mail, MapPin, 
  ArrowLeft, ArrowRight, Users, Building2, Check, Globe, Shield,
  Lock, Eye, EyeOff, Briefcase, BadgeCheck, ChevronRight
} from 'lucide-react';
import { COUNTRIES, CURRENCIES, getCurrencyForCountry, getOrganizationCurrency } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().default('India'),
});

// Regex patterns for validation
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;

// Helper function for PAN validation
const panValidation = (value: string, ctx: z.RefinementCtx, isRequired: boolean = true) => {
  if (!value || value === '') {
    if (isRequired) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PAN number is required',
      });
    }
    return;
  }
  if (value.length !== 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'PAN must be exactly 10 characters',
    });
    return;
  }
  if (!PAN_REGEX.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid PAN format. Expected: ABCDE1234F (5 letters, 4 digits, 1 letter)',
    });
  }
};

// Helper function for GST validation
const gstValidation = (value: string, ctx: z.RefinementCtx) => {
  if (!value || value === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GST number is required',
    });
    return;
  }
  if (value.length !== 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GST must be exactly 15 characters',
    });
    return;
  }
  if (!GST_REGEX.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid GST format. Expected: 22ABCDE1234F1Z5 (2 digits state code, PAN, entity code, Z, checksum)',
    });
  }
};

const vendorRegistrationSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_type: z.string().optional(),
  registration_number: z.string().optional(),
  pan_number: z.string().superRefine((val, ctx) => panValidation(val, ctx, true)),
  gst_number: z.string().superRefine(gstValidation),
  primary_email: z.string().email('Invalid email address'),
  secondary_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  primary_phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(PHONE_REGEX, 'Invalid phone number format'),
  secondary_phone: z.string().regex(PHONE_REGEX, 'Invalid phone number format').optional().or(z.literal('')),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(3, 'Currency is required'),
  registered_address: addressSchema,
  business_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  signatory_name: z.string().min(1, 'Signatory name is required'),
  signatory_designation: z.string().optional(),
  signatory_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  signatory_phone: z.string().regex(PHONE_REGEX, 'Invalid phone number format').optional().or(z.literal('')),
  signatory_pan: z.string().optional().superRefine((val, ctx) => {
    if (val && val !== '') {
      panValidation(val, ctx, false);
    }
  }),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  account_number: z.string().optional().superRefine((val, ctx) => {
    if (val && val !== '') {
      if (val.length < 9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account number must be at least 9 digits',
        });
        return;
      }
      if (val.length > 18) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account number cannot exceed 18 digits',
        });
        return;
      }
      if (!/^[0-9]+$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account number must contain only digits',
        });
      }
    }
  }),
  ifsc_code: z.string().optional().superRefine((val, ctx) => {
    if (val && val !== '') {
      if (val.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'IFSC code must be exactly 11 characters',
        });
        return;
      }
      if (!IFSC_REGEX.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid IFSC format. Expected: ABCD0123456 (4 letters, 0, 6 alphanumeric)',
        });
      }
    }
  }),
  account_holder_name: z.string().optional(),
  business_description: z.string().optional(),
  years_in_business: z.number().min(0).optional(),
  annual_turnover: z.number().min(0).optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type VendorRegistrationForm = z.infer<typeof vendorRegistrationSchema>;

const VendorRegistrationPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [sameAsRegistered, setSameAsRegistered] = useState(false);
  const [sameAsBusiness, setSameAsBusiness] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch organization settings for base currency
  const { data: orgSettings } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<VendorRegistrationForm>({
    resolver: zodResolver(vendorRegistrationSchema),
    mode: 'onChange',
    defaultValues: {
      company_name: '',
      company_type: '',
      registration_number: '',
      pan_number: '',
      gst_number: '',
      primary_email: '',
      secondary_email: '',
      primary_phone: '',
      secondary_phone: '',
      website: '',
      country: 'India',
      currency: getOrganizationCurrency(orgSettings),
      registered_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      business_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      billing_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      signatory_name: '',
      signatory_designation: '',
      signatory_email: '',
      signatory_phone: '',
      signatory_pan: '',
      bank_name: '',
      bank_branch: '',
      account_number: '',
      ifsc_code: '',
      account_holder_name: '',
      business_description: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Update currency when country changes
  const watchedCountry = form.watch('country');
  useEffect(() => {
    if (watchedCountry) {
      const countryCurrency = getCurrencyForCountry(watchedCountry);
      form.setValue('currency', countryCurrency);
    }
  }, [watchedCountry, form]);

  // Update currency when organization settings load
  useEffect(() => {
    if (orgSettings?.base_currency && !form.getValues('currency')) {
      form.setValue('currency', orgSettings.base_currency);
    }
  }, [orgSettings, form]);

  const handleSubmit = async (values: VendorRegistrationForm) => {
    try {
      setIsSubmitting(true);

      // Check for existing vendor registrations with same email, GST, or PAN
      const { data: existingVendors, error: checkError } = await supabase
        .from('vendor_registrations')
        .select('id, status, company_name, primary_email, gst_number, pan_number')
        .or(`primary_email.eq.${values.primary_email},gst_number.eq.${values.gst_number},pan_number.eq.${values.pan_number}`);

      if (checkError) {
        throw checkError;
      }

      if (existingVendors && existingVendors.length > 0) {
        const emailMatch = existingVendors.find(v => v.primary_email === values.primary_email);
        const gstMatch = existingVendors.find(v => v.gst_number === values.gst_number);
        const panMatch = existingVendors.find(v => v.pan_number === values.pan_number);

        let errorMessage = '';
        let conflictType: 'email' | 'gst' | 'pan' = 'email';
        let existingCompany = '';
        let existingStatus = '';

        if (emailMatch) {
          errorMessage = `This email is already registered for vendor "${emailMatch.company_name}" with status: ${emailMatch.status}.`;
          conflictType = 'email';
          existingCompany = emailMatch.company_name;
          existingStatus = emailMatch.status;
        } else if (gstMatch) {
          errorMessage = `This GST number is already registered for vendor "${gstMatch.company_name}" with status: ${gstMatch.status}.`;
          conflictType = 'gst';
          existingCompany = gstMatch.company_name;
          existingStatus = gstMatch.status;
        } else if (panMatch) {
          errorMessage = `This PAN number is already registered for vendor "${panMatch.company_name}" with status: ${panMatch.status}.`;
          conflictType = 'pan';
          existingCompany = panMatch.company_name;
          existingStatus = panMatch.status;
        }

        navigate('/vendor-registration/duplicate', {
          state: {
            errorMessage,
            existingCompany,
            existingStatus,
            conflictType
          }
        });
        return;
      }

      // Try to create user account
      let userId: string;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.primary_email,
        password: values.password,
        options: {
          data: {
            full_name: values.signatory_name,
          },
        },
      });

      if (authError && authError.message !== 'User already registered') {
        throw authError;
      }

      if (authData?.user) {
        userId = authData.user.id;
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.primary_email,
          password: values.password,
        });

        if (signInError) {
          throw new Error('Unable to verify user credentials. Please check your password or use a different email address.');
        }

        userId = signInData.user.id;
        await supabase.auth.signOut();
      }

      // Prepare vendor data for database insertion
      const vendorData = {
        company_name: values.company_name,
        company_type: values.company_type || null,
        registration_number: values.registration_number || null,
        pan_number: values.pan_number,
        gst_number: values.gst_number,
        primary_email: values.primary_email,
        secondary_email: values.secondary_email || null,
        primary_phone: values.primary_phone,
        secondary_phone: values.secondary_phone || null,
        website: values.website || null,
        registered_address: JSON.stringify(values.registered_address),
        business_address: values.business_address ? JSON.stringify(values.business_address) : null,
        billing_address: values.billing_address ? JSON.stringify(values.billing_address) : null,
        signatory_name: values.signatory_name,
        signatory_designation: values.signatory_designation || null,
        signatory_email: values.signatory_email || null,
        signatory_phone: values.signatory_phone || null,
        signatory_pan: values.signatory_pan || null,
        bank_name: values.bank_name || null,
        bank_branch: values.bank_branch || null,
        account_number: values.account_number || null,
        ifsc_code: values.ifsc_code || null,
        account_holder_name: values.account_holder_name || null,
        business_description: values.business_description || null,
        years_in_business: values.years_in_business || null,
        annual_turnover: values.annual_turnover || null,
        country: values.country,
        currency: values.currency,
        user_id: userId,
        status: 'pending' as const,
      };

      const { error: insertError } = await supabase
        .from('vendor_registrations')
        .insert(vendorData);

      if (insertError) throw insertError;

      // Mark profile as vendor user
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ is_vendor: true })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Error marking profile as vendor:', profileUpdateError);
      }

      // Assign vendor role
      const { data: signInForRole, error: roleSignInError } = await supabase.auth.signInWithPassword({
        email: values.primary_email,
        password: values.password,
      });

      if (!roleSignInError && signInForRole.user) {
        const { data: vendorRole, error: vendorRoleError } = await supabase
          .from('custom_roles')
          .select('id')
          .ilike('name', 'vendor')
          .single();
        
        if (!vendorRoleError && vendorRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role_id: vendorRole.id,
            });

          if (roleError && !roleError.message.includes('duplicate key')) {
            throw roleError;
          }
        }

        await supabase.auth.signOut();
      }

      toast({
        title: 'Registration Submitted Successfully!',
        description: `Thank you ${values.company_name}! Your vendor registration has been submitted and is now under review.`,
      });

      navigate('/vendor-registration/success', { 
        state: { 
          email: values.primary_email, 
          password: values.password,
          companyName: values.company_name 
        } 
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAddress = (from: 'registered' | 'business', to: 'business' | 'billing') => {
    const fromAddress = form.getValues(`${from}_address`);
    form.setValue(`${to}_address`, fromAddress);
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setUploadedDocuments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const steps = [
    { number: 1, title: 'Company', subtitle: 'Basic details', icon: Building },
    { number: 2, title: 'Contact', subtitle: 'Communication', icon: Phone },
    { number: 3, title: 'Address', subtitle: 'Locations', icon: MapPin },
    { number: 4, title: 'Signatory', subtitle: 'Authorization', icon: User },
    { number: 5, title: 'Banking', subtitle: 'Payment info', icon: CreditCard },
    { number: 6, title: 'Security', subtitle: 'Create account', icon: Lock },
  ];

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="flex min-h-screen">
        {/* Left Sidebar - Branding & Progress */}
        <div className="hidden lg:flex lg:w-[380px] xl:w-[420px] bg-gradient-to-b from-primary via-primary to-primary/90 text-primary-foreground flex-col relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAtMTZjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTE2IDBjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>
          
          {/* Header */}
          <div className="relative z-10 p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">ProcureFlow</h1>
                <p className="text-sm text-primary-foreground/70">Vendor Portal</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="relative z-10 flex-1 px-8 py-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Vendor Registration</h2>
              <p className="text-primary-foreground/70 text-sm">
                Complete all steps to register as a vendor partner
              </p>
            </div>

            <div className="space-y-1">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const isLast = index === steps.length - 1;
                
                return (
                  <div key={step.number} className="relative">
                    <button
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(step.number)}
                      disabled={!isCompleted && !isActive}
                      className={cn(
                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-left",
                        isActive && "bg-white/15 backdrop-blur-sm",
                        isCompleted && "hover:bg-white/10 cursor-pointer",
                        !isCompleted && !isActive && "opacity-50"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
                        isCompleted ? "bg-emerald-400 text-emerald-900 shadow-lg shadow-emerald-500/30" :
                        isActive ? "bg-white text-primary shadow-lg" :
                        "bg-white/10 text-primary-foreground/60"
                      )}>
                        {isCompleted ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-semibold truncate",
                          isActive ? "text-white" : "text-primary-foreground/80"
                        )}>
                          {step.title}
                        </p>
                        <p className={cn(
                          "text-xs truncate",
                          isActive ? "text-primary-foreground/70" : "text-primary-foreground/50"
                        )}>
                          {step.subtitle}
                        </p>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-5 h-5 text-white/70" />
                      )}
                    </button>
                    
                    {/* Connector Line */}
                    {!isLast && (
                      <div className="absolute left-[1.625rem] top-[3.25rem] w-0.5 h-3">
                        <div className={cn(
                          "w-full h-full rounded-full transition-colors duration-300",
                          isCompleted ? "bg-emerald-400" : "bg-white/20"
                        )} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 p-8 border-t border-white/10">
            <div className="flex items-center gap-3 text-primary-foreground/60 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your data is secure and encrypted</span>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="text-muted-foreground hover:text-foreground -ml-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </div>
                
                {/* Mobile Progress */}
                <div className="lg:hidden flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Step {currentStep} of {steps.length}
                  </span>
                </div>

                <Link to="/login">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Users className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Mobile Step Indicator */}
              <div className="lg:hidden mt-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary rounded-lg">
                    {React.createElement(steps[currentStep - 1].icon, { className: "w-4 h-4 text-white" })}
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">{steps[currentStep - 1].title}</h2>
                    <p className="text-xs text-muted-foreground">{steps[currentStep - 1].subtitle}</p>
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-1.5" />
              </div>
            </div>
          </header>

          {/* Main Form Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-3xl mx-auto">
              {/* Desktop Step Header */}
              <div className="hidden lg:block mb-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    {React.createElement(steps[currentStep - 1].icon, { className: "w-6 h-6 text-primary" })}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {steps[currentStep - 1].title}
                    </h2>
                    <p className="text-muted-foreground">
                      {steps[currentStep - 1].subtitle} — Step {currentStep} of {steps.length}
                    </p>
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-1.5" />
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Step 1: Company Details */}
                  {currentStep === 1 && (
                    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Company Information</CardTitle>
                        <CardDescription>Provide your organization's basic details and tax information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-foreground font-medium">
                                  Company Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="Enter your registered company name" 
                                      className="pl-10 h-11 border-slate-200 focus:border-primary"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="company_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Company Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 border-slate-200">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="private_limited">Private Limited</SelectItem>
                                    <SelectItem value="public_limited">Public Limited</SelectItem>
                                    <SelectItem value="partnership">Partnership</SelectItem>
                                    <SelectItem value="llp">Limited Liability Partnership</SelectItem>
                                    <SelectItem value="proprietorship">Proprietorship</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="registration_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Registration Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="CIN / Registration No." 
                                    className="h-11 border-slate-200"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-primary" />
                            Tax Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="pan_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">
                                    PAN Number <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="ABCDE1234F" 
                                      className="h-11 border-slate-200 font-mono uppercase"
                                      {...field} 
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                      maxLength={10}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">Format: 5 letters, 4 digits, 1 letter</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="gst_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">
                                    GST Number <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="22ABCDE1234F1Z5" 
                                      className="h-11 border-slate-200 font-mono uppercase"
                                      {...field} 
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                      maxLength={15}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">15-character GST identification number</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            Location & Currency
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="country"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">
                                    Country <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11 border-slate-200">
                                        <SelectValue placeholder="Select country" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {COUNTRIES.map((country) => (
                                        <SelectItem key={country.code} value={country.name}>
                                          {country.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="currency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">
                                    Currency <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11 border-slate-200">
                                        <SelectValue placeholder="Select currency" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {CURRENCIES.map((currency) => (
                                        <SelectItem key={currency.code} value={currency.code}>
                                          {currency.code} - {currency.name} ({currency.symbol})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-primary" />
                            Business Profile
                          </h4>
                          <div className="space-y-5">
                            <FormField
                              control={form.control}
                              name="website"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Website</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="https://www.yourcompany.com" 
                                        className="pl-10 h-11 border-slate-200"
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="business_description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Business Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Briefly describe your business activities, products, or services..." 
                                      className="min-h-[100px] border-slate-200 resize-none"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <FormField
                                control={form.control}
                                name="years_in_business"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">Years in Business</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="0" 
                                        className="h-11 border-slate-200"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="annual_turnover"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">
                                      Annual Turnover ({form.watch('currency') || 'INR'})
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="0" 
                                        className="h-11 border-slate-200"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 2: Contact Information */}
                  {currentStep === 2 && (
                    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                        <CardDescription>Primary and alternate contact details for your organization</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-5">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary" />
                            Email Addresses
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="primary_email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">
                                    Primary Email <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input 
                                        type="email" 
                                        placeholder="company@example.com" 
                                        className="pl-10 h-11 border-slate-200"
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-xs">This will be your login email</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="secondary_email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Secondary Email</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input 
                                        type="email" 
                                        placeholder="alternate@example.com" 
                                        className="pl-10 h-11 border-slate-200"
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 space-y-5">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary" />
                            Phone Numbers
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="primary_phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">
                                    Primary Phone <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="+91 9876543210" 
                                        className="pl-10 h-11 border-slate-200"
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="secondary_phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Secondary Phone</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="+91 9876543210" 
                                        className="pl-10 h-11 border-slate-200"
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Addresses */}
                  {currentStep === 3 && (
                    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Address Information</CardTitle>
                        <CardDescription>Registered office, business operations, and billing addresses</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* Registered Address */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <MapPin className="w-4 h-4 text-primary" />
                            </div>
                            <h4 className="font-semibold text-foreground">
                              Registered Address <span className="text-destructive">*</span>
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 gap-4 pl-8">
                            <FormField
                              control={form.control}
                              name="registered_address.street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Street Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Building, Street, Area" className="h-11 border-slate-200" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField
                                control={form.control}
                                name="registered_address.city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">City</FormLabel>
                                    <FormControl>
                                      <Input placeholder="City" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="registered_address.state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">State</FormLabel>
                                    <FormControl>
                                      <Input placeholder="State" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="registered_address.postal_code"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">PIN Code</FormLabel>
                                    <FormControl>
                                      <Input placeholder="PIN Code" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="registered_address.country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">Country</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Country" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Business Address */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-50 rounded-lg">
                                <Building className="w-4 h-4 text-blue-600" />
                              </div>
                              <h4 className="font-semibold text-foreground">Business Address</h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="same-as-registered"
                                checked={sameAsRegistered}
                                onCheckedChange={(checked) => {
                                  setSameAsRegistered(checked as boolean);
                                  if (checked) {
                                    copyAddress('registered', 'business');
                                  }
                                }}
                              />
                              <label htmlFor="same-as-registered" className="text-sm text-muted-foreground cursor-pointer">
                                Same as registered
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 pl-8">
                            <FormField
                              control={form.control}
                              name="business_address.street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Street Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Building, Street, Area" className="h-11 border-slate-200" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField
                                control={form.control}
                                name="business_address.city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">City</FormLabel>
                                    <FormControl>
                                      <Input placeholder="City" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="business_address.state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">State</FormLabel>
                                    <FormControl>
                                      <Input placeholder="State" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="business_address.postal_code"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">PIN Code</FormLabel>
                                    <FormControl>
                                      <Input placeholder="PIN Code" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="business_address.country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">Country</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Country" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Billing Address */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-50 rounded-lg">
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                              </div>
                              <h4 className="font-semibold text-foreground">Billing Address</h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="same-as-business"
                                checked={sameAsBusiness}
                                onCheckedChange={(checked) => {
                                  setSameAsBusiness(checked as boolean);
                                  if (checked) {
                                    copyAddress('business', 'billing');
                                  }
                                }}
                              />
                              <label htmlFor="same-as-business" className="text-sm text-muted-foreground cursor-pointer">
                                Same as business
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 pl-8">
                            <FormField
                              control={form.control}
                              name="billing_address.street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground font-medium">Street Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Building, Street, Area" className="h-11 border-slate-200" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField
                                control={form.control}
                                name="billing_address.city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">City</FormLabel>
                                    <FormControl>
                                      <Input placeholder="City" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="billing_address.state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">State</FormLabel>
                                    <FormControl>
                                      <Input placeholder="State" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="billing_address.postal_code"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">PIN Code</FormLabel>
                                    <FormControl>
                                      <Input placeholder="PIN Code" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="billing_address.country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground font-medium">Country</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Country" className="h-11 border-slate-200" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 4: Signatory Details */}
                  {currentStep === 4 && (
                    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Authorized Signatory</CardTitle>
                        <CardDescription>Details of the person authorized to sign on behalf of the organization</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="signatory_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">
                                  Full Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="Authorized signatory name" 
                                      className="pl-10 h-11 border-slate-200"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="signatory_designation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Designation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 border-slate-200">
                                      <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="director">Director</SelectItem>
                                    <SelectItem value="ceo">CEO</SelectItem>
                                    <SelectItem value="cfo">CFO</SelectItem>
                                    <SelectItem value="managing_director">Managing Director</SelectItem>
                                    <SelectItem value="partner">Partner</SelectItem>
                                    <SelectItem value="proprietor">Proprietor</SelectItem>
                                    <SelectItem value="authorized_signatory">Authorized Signatory</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="signatory_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      type="email" 
                                      placeholder="signatory@company.com" 
                                      className="pl-10 h-11 border-slate-200"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="signatory_phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Phone</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="+91 9876543210" 
                                      className="pl-10 h-11 border-slate-200"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="signatory_pan"
                          render={({ field }) => (
                            <FormItem className="max-w-md">
                              <FormLabel className="text-foreground font-medium">PAN Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ABCDE1234F" 
                                  className="h-11 border-slate-200 font-mono uppercase"
                                  {...field} 
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  maxLength={10}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">Personal PAN of the authorized signatory</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 5: Bank Details */}
                  {currentStep === 5 && (
                    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Banking Details</CardTitle>
                        <CardDescription>Bank account information for receiving payments</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="bank_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Bank Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="Enter bank name" 
                                      className="pl-10 h-11 border-slate-200"
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bank_branch"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Branch</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Branch name" 
                                    className="h-11 border-slate-200"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="account_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">Account Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter account number" 
                                    className="h-11 border-slate-200 font-mono"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                                    maxLength={18}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">9-18 digit account number</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ifsc_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">IFSC Code</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="ABCD0123456" 
                                    className="h-11 border-slate-200 font-mono uppercase"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    maxLength={11}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">11-character IFSC code</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="account_holder_name"
                          render={({ field }) => (
                            <FormItem className="max-w-md">
                              <FormLabel className="text-foreground font-medium">Account Holder Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Name as per bank records" 
                                  className="h-11 border-slate-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Document Upload Section */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 rounded-lg">
                              <FileText className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">Supporting Documents</h4>
                              <p className="text-xs text-muted-foreground">Upload required verification documents</p>
                            </div>
                          </div>
                          
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-primary/50 transition-colors bg-slate-50/50">
                            <div className="text-center">
                              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Upload className="h-6 w-6 text-primary" />
                              </div>
                              <label htmlFor="file-upload" className="cursor-pointer">
                                <span className="block text-sm font-semibold text-foreground">
                                  Drop files here or click to upload
                                </span>
                                <span className="block text-xs text-muted-foreground mt-1">
                                  Incorporation Certificate, PAN Card, GST Certificate, Cancelled Cheque
                                </span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="sr-only"
                                  onChange={handleDocumentUpload}
                                />
                              </label>
                              <p className="mt-3 text-xs text-muted-foreground">
                                PDF, JPG, PNG up to 10MB each
                              </p>
                            </div>
                          </div>

                          {/* Uploaded Documents List */}
                          {uploadedDocuments.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-foreground">Uploaded Documents:</h5>
                              <div className="space-y-2">
                                {uploadedDocuments.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                      <FileText className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-sm text-foreground">{file.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({(file.size / 1024).toFixed(1)} KB)
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeDocument(index)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 6: Account Setup */}
                  {currentStep === 6 && (
                    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Create Your Account</CardTitle>
                        <CardDescription>Set up your login credentials for the vendor portal</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Mail className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Login Email</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {form.watch('primary_email') || 'Please complete step 2 to set your email'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">
                                  Password <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      type={showPassword ? "text" : "password"}
                                      placeholder="Create a strong password" 
                                      className="pl-10 pr-10 h-11 border-slate-200"
                                      {...field} 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium">
                                  Confirm Password <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      type={showConfirmPassword ? "text" : "password"}
                                      placeholder="Re-enter your password" 
                                      className="pl-10 pr-10 h-11 border-slate-200"
                                      {...field} 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <h5 className="text-sm font-medium text-amber-800 mb-2">Password Requirements</h5>
                          <ul className="text-xs text-amber-700 space-y-1">
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              At least 8 characters long
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Contains at least one uppercase letter
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Contains at least one lowercase letter
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Contains at least one number
                            </li>
                          </ul>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">
                                After submitting, your registration will be reviewed by our team. 
                                You'll receive an email notification once your account is approved 
                                and you can access the full vendor portal.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                        className="gap-2 h-11 px-6"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                      </Button>
                    ) : (
                      <div />
                    )}
                    
                    {currentStep < 6 ? (
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
                        className="gap-2 h-11 px-6"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="gap-2 h-11 px-8"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Submit Registration
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationPage;
