import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
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

    // Use SMTP with the saved provider credentials
    const host: string | null = emailProvider.smtp_host;
    const port: number = emailProvider.smtp_port || 587;
    const secure: boolean = emailProvider.smtp_secure ?? true;
    const username: string | null = emailProvider.username;
    const password: string | null = emailProvider.smtp_password || null;
    const fromEmail: string | null = emailProvider.from_email;
    const fromName: string = emailProvider.from_name || 'System Notification';

    if (!host || !fromEmail) {
      return new Response(
        JSON.stringify({ success: false, message: 'SMTP host or from email is not configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'SMTP username or password missing. Please save your app password in Email Settings.' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const client = new SmtpClient();

    // Connect using TLS for port 465, or STARTTLS/plain for others per provider config
    if (secure && port === 465) {
      await client.connectTLS({ hostname: host, port, username, password });
    } else {
      await client.connect({ hostname: host, port, username, password });
    }

    const fromHeader = `${fromName} <${fromEmail}>`;
    const plainText = text || (html ? 'Your email client does not support HTML.' : '');

    await client.send({
      from: fromHeader,
      to,
      subject,
      content: plainText,
      html: html,
    });

    await client.close();

    const sentAt = new Date().toISOString();
    console.log('SMTP email sent', { to, subject, provider: emailProvider.provider, host, port, sent_at: sentAt, is_test });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email ${is_test ? 'test ' : ''}sent successfully to ${to}`,
        data: { to, subject, sent_at: sentAt },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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