import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  is_test?: boolean;
}

interface EmailResponse {
  success: boolean;
  message: string;
  data?: {
    to: string;
    subject: string;
    sent_at: string;
  };
}

export const useEmailService = () => {
  const { toast } = useToast();

  const sendEmail = async (options: SendEmailOptions): Promise<EmailResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: options
      });

      if (error) {
        console.error('Email service error:', error);
        throw new Error(error.message || 'Failed to send email');
      }

      if (!data.success) {
        throw new Error(data.message || 'Email sending failed');
      }

      // Show success toast for non-test emails
      if (!options.is_test) {
        toast({
          title: "Email Sent",
          description: `Email sent successfully to ${options.to}`,
        });
      }

      return data;
    } catch (error: any) {
      console.error('Send email error:', error);
      
      // Show error toast
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });

      return {
        success: false,
        message: error.message || "Failed to send email"
      };
    }
  };

  const sendTestEmail = async (testEmail: string): Promise<EmailResponse> => {
    const testEmailOptions: SendEmailOptions = {
      to: testEmail,
      subject: "Test Email from Procurement System",
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your email provider configuration is working correctly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Sent at: ${new Date().toLocaleString()}</li>
          <li>To: ${testEmail}</li>
          <li>From: Procurement System</li>
        </ul>
        <p>If you received this email, your email configuration is working properly!</p>
        <hr>
        <p><em>This is an automated test email. Please do not reply.</em></p>
      `,
      text: `Email Configuration Test\n\nThis is a test email to verify your email provider configuration is working correctly.\n\nTest Details:\n- Sent at: ${new Date().toLocaleString()}\n- To: ${testEmail}\n- From: Procurement System\n\nIf you received this email, your email configuration is working properly!\n\nThis is an automated test email. Please do not reply.`,
      is_test: true
    };

    return sendEmail(testEmailOptions);
  };

  return {
    sendEmail,
    sendTestEmail
  };
};

// Standard email templates for common use cases
export const EmailTemplates = {
  // Procurement request notifications
  procurementRequestSubmitted: (requesterName: string, requestNumber: string) => ({
    subject: `Procurement Request ${requestNumber} Submitted`,
    html: `
      <h2>Procurement Request Submitted</h2>
      <p>A new procurement request has been submitted for your review.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Request Number: ${requestNumber}</li>
        <li>Submitted by: ${requesterName}</li>
        <li>Submitted at: ${new Date().toLocaleString()}</li>
      </ul>
      <p>Please log in to the system to review and process this request.</p>
    `
  }),

  // Approval notifications
  requestApproved: (requestNumber: string) => ({
    subject: `Procurement Request ${requestNumber} Approved`,
    html: `
      <h2>Request Approved</h2>
      <p>Your procurement request <strong>${requestNumber}</strong> has been approved.</p>
      <p>You will be notified when the items are processed and available for pickup.</p>
    `
  }),

  requestRejected: (requestNumber: string, reason: string) => ({
    subject: `Procurement Request ${requestNumber} Rejected`,
    html: `
      <h2>Request Rejected</h2>
      <p>Your procurement request <strong>${requestNumber}</strong> has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact the procurement team if you have any questions.</p>
    `
  }),

  // Vendor notifications
  vendorRegistrationApproved: (companyName: string, vendorNumber: string) => ({
    subject: `Vendor Registration Approved - Welcome to Our System`,
    html: `
      <h2>Welcome to Our Vendor Network</h2>
      <p>Congratulations! Your vendor registration for <strong>${companyName}</strong> has been approved.</p>
      <p><strong>Your Vendor Number:</strong> ${vendorNumber}</p>
      <p>You can now:</p>
      <ul>
        <li>Register your products in our catalog</li>
        <li>Respond to RFP requests</li>
        <li>Manage your vendor profile</li>
      </ul>
      <p>Please log in to the vendor portal to get started.</p>
    `
  })
};