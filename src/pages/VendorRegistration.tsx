
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Building, FileText, Upload, User, CreditCard, Phone, Mail, MapPin } from 'lucide-react';

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
});

type VendorRegistrationForm = z.infer<typeof vendorRegistrationSchema>;

const VendorRegistrationPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [sameAsRegistered, setSameAsRegistered] = useState(false);
  const [sameAsBusiness, setSameAsBusiness] = useState(false);

  const form = useForm<VendorRegistrationForm>({
    resolver: zodResolver(vendorRegistrationSchema),
    defaultValues: {
      registered_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      business_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
      billing_address: { country: 'India', street: '', city: '', state: '', postal_code: '' },
    },
  });

  const handleSubmit = async (values: VendorRegistrationForm) => {
    try {
      setIsSubmitting(true);

      // Create user account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.primary_email,
        password: 'TempPassword123!', // Temporary password - vendor will reset
        options: {
          data: {
            full_name: values.signatory_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create proper vendor data with all required fields
      const vendorData = {
        ...values,
        user_id: authData.user.id,
        status: 'pending' as const,
        // Ensure addresses are properly formatted
        registered_address: {
          street: values.registered_address.street,
          city: values.registered_address.city,
          state: values.registered_address.state,
          postal_code: values.registered_address.postal_code,
          country: values.registered_address.country,
        },
        business_address: values.business_address ? {
          street: values.business_address.street || '',
          city: values.business_address.city || '',
          state: values.business_address.state || '',
          postal_code: values.business_address.postal_code || '',
          country: values.business_address.country || 'India',
        } : undefined,
        billing_address: values.billing_address ? {
          street: values.billing_address.street || '',
          city: values.billing_address.city || '',
          state: values.billing_address.state || '',
          postal_code: values.billing_address.postal_code || '',
          country: values.billing_address.country || 'India',
        } : undefined,
      };

      const { error: insertError } = await supabase
        .from('vendor_registrations')
        .insert([vendorData]);

      if (insertError) throw insertError;

      // Assign vendor role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'vendor',
        });

      if (roleError) throw roleError;

      toast({
        title: 'Registration Successful',
        description: 'Your vendor registration has been submitted. You will receive login credentials via email.',
      });

      navigate('/vendor-registration-success');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration',
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

  const steps = [
    { number: 1, title: 'Company Details', icon: Building },
    { number: 2, title: 'Contact Information', icon: Phone },
    { number: 3, title: 'Addresses', icon: MapPin },
    { number: 4, title: 'Signatory Details', icon: User },
    { number: 5, title: 'Bank Details', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Registration</h1>
          <p className="text-gray-600 mt-2">Register your company to become an approved vendor</p>
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
                          <FormLabel>Annual Turnover (INR)</FormLabel>
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
              
              {currentStep < 5 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
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
