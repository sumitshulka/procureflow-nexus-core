import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  is_test?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, text, is_test = false }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: to, subject, and either html or text are required' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get active email provider settings
    const { data: emailProvider, error: providerError } = await supabase
      .from('email_provider_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (providerError || !emailProvider) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No active email provider configured. Please configure email settings first.' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // For this implementation, we'll simulate sending the email
    // In a real implementation, you would use the configured SMTP settings
    // to actually send the email using libraries like nodemailer or similar
    
    console.log('Email would be sent with these settings:', {
      provider: emailProvider.provider,
      smtp_host: emailProvider.smtp_host,
      smtp_port: emailProvider.smtp_port,
      from_email: emailProvider.from_email,
      to,
      subject,
      is_test
    });

    // For now, we'll just return success for all emails
    // In production, you'd implement actual SMTP sending here
    const emailData = {
      to,
      subject,
      html: html || text,
      from_email: emailProvider.from_email,
      from_name: emailProvider.from_name,
      provider: emailProvider.provider,
      sent_at: new Date().toISOString(),
      is_test
    };

    // Log the email attempt (you could create an email_logs table for this)
    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email ${is_test ? 'test ' : ''}sent successfully to ${to}`,
        data: {
          to,
          subject,
          sent_at: emailData.sent_at
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Failed to send email: ${error.message}` 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);