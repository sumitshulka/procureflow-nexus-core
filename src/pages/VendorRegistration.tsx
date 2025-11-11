import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building, FileText, Upload, User, CreditCard, Phone, Mail, MapPin, ArrowLeft, Users, Building2 } from 'lucide-react';
import { COUNTRIES, CURRENCIES, getCurrencyForCountry, getOrganizationCurrency } from '@/utils/currencyUtils';

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().default('India'),
});

const vendorRegistrationSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_type: z.string().optional(),
  registration_number: z.string().optional(),
  pan_number: z.string().min(10, 'PAN number must be 10 characters').max(10),
  gst_number: z.string().min(15, 'GST number must be 15 characters').max(15),
  primary_email: z.string().email('Invalid email address'),
  secondary_email: z.string().email().optional().or(z.literal('')),
  primary_phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  secondary_phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(3, 'Currency is required'),
  registered_address: addressSchema,
  business_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  signatory_name: z.string().min(1, 'Signatory name is required'),
  signatory_designation: z.string().optional(),
  signatory_email: z.string().email().optional().or(z.literal('')),
  signatory_phone: z.string().optional(),
  signatory_pan: z.string().min(10).max(10).optional().or(z.literal('')),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  account_holder_name: z.string().optional(),
  business_description: z.string().optional(),
  years_in_business: z.number().min(0).optional(),
  annual_turnover: z.number().min(0).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
    defaultValues: {
      country: 'India',
      currency: getOrganizationCurrency(orgSettings),
      registered_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      business_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      billing_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
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

        // Navigate to duplicate confirmation page
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
        // If user already exists, we need to get their ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.primary_email,
          password: values.password,
        });

        if (signInError) {
          throw new Error('Unable to verify user credentials. Please check your password or use a different email address.');
        }

        userId = signInData.user.id;
        
        // Sign out immediately since this is a no-login process
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
        // Don't throw error - this is not critical for registration
      }

      // Assign vendor role (with proper authentication)
      const { data: signInForRole, error: roleSignInError } = await supabase.auth.signInWithPassword({
        email: values.primary_email,
        password: values.password,
      });

      if (!roleSignInError && signInForRole.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'vendor',
          });

        // Sign out immediately
        await supabase.auth.signOut();

        if (roleError && !roleError.message.includes('duplicate key')) {
          throw roleError;
        }
      }

      toast({
        title: 'Registration Submitted Successfully!',
        description: `Thank you ${values.company_name}! Your vendor registration has been submitted and is now under review. You will receive your login credentials and further instructions shortly.`,
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
    { number: 1, title: 'Company Details', icon: Building },
    { number: 2, title: 'Contact Information', icon: Phone },
    { number: 3, title: 'Addresses', icon: MapPin },
    { number: 4, title: 'Signatory Details', icon: User },
    { number: 5, title: 'Bank Details', icon: CreditCard },
    { number: 6, title: 'Account Setup', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Link to="/login">
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Back to Login
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Vendor Registration</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Register your company to participate in procurement opportunities. 
            If you already have an account, use the "Back to Login" button above.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'bg-blue-500 border-blue-500 text-white' :
                    'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Company Details */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Company Details
                  </CardTitle>
                  <CardDescription>Basic information about your company</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
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
                          <FormLabel>Company Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Private Limited, Partnership" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="pan_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="ABCDE1234F" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gst_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="22ABCDE1234F1Z5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registration_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Company registration number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                          <FormLabel>Currency *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
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

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.yourcompany.com" {...field} />
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
                        <FormLabel>Business Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe your business activities" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="years_in_business"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years in Business</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
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
                          <FormLabel>Annual Turnover ({form.watch('currency') || 'USD'})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>Company contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primary_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="company@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondary_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="alternate@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primary_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" {...field} />
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
                          <FormLabel>Secondary Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Addresses */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address Information
                  </CardTitle>
                  <CardDescription>Registered, business, and billing addresses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Registered Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Registered Address *</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registered_address.street"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registered_address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" {...field} />
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
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter state" {...field} />
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
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter postal code" {...field} />
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
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="India" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Business Address */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Business Address</h4>
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
                        <label htmlFor="same-as-registered" className="text-sm">
                          Same as registered address
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="business_address.street"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="business_address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" {...field} />
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
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter state" {...field} />
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
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter postal code" {...field} />
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
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="India" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Billing Address</h4>
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
                        <label htmlFor="same-as-business" className="text-sm">
                          Same as business address
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billing_address.street"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="billing_address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" {...field} />
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
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter state" {...field} />
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
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter postal code" {...field} />
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
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="India" {...field} />
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

            {/* Step 4: Signatory Details */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Authorized Signatory Details
                  </CardTitle>
                  <CardDescription>Information about the authorized signatory</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="signatory_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signatory Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter signatory name" {...field} />
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
                          <FormLabel>Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Director, CEO" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="signatory_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="signatory@example.com" {...field} />
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
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" {...field} />
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
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input placeholder="ABCDE1234F" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 5: Bank Details */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Bank Details
                  </CardTitle>
                  <CardDescription>Banking information for payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bank name" {...field} />
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
                          <FormLabel>Branch</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter branch name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ifsc_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter IFSC code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="account_holder_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter account holder name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Document Upload Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Document Upload
                    </h4>
                    <p className="text-sm text-gray-600">
                      Upload required documents (Incorporation Certificate, PAN Card, GST Certificate, Cancelled Cheque, etc.)
                    </p>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              Click to upload files
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
                          <p className="mt-1 text-xs text-gray-500">
                            PDF, JPG, PNG up to 10MB each
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    {uploadedDocuments.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Uploaded Documents:</h5>
                        {uploadedDocuments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeDocument(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 6: Account Setup */}
            {currentStep === 6 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Setup
                  </CardTitle>
                  <CardDescription>Create your vendor portal login credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password (min 8 characters)" {...field} />
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
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Account Information</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Login Email:</strong> {form.watch('primary_email') || 'Please complete step 2'}
                    </p>
                    <p className="text-sm text-blue-700">
                      You'll use these credentials to access the vendor portal where you can track your registration status and manage your profile.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              {currentStep < 6 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default VendorRegistrationPage;
