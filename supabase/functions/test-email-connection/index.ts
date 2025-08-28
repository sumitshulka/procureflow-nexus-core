import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  username: string;
  password: string;
  from_email: string;
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
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    const { smtp_host, smtp_port, smtp_secure, username, password, from_email }: TestEmailRequest = await req.json();

    console.log('Testing email connection with:', {
      smtp_host,
      smtp_port,
      smtp_secure,
      username,
      from_email: from_email
    });

    // Validate required fields
    if (!smtp_host || !smtp_port || !username || !password || !from_email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: smtp_host, smtp_port, username, password, and from_email are required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Test SMTP connection by attempting to connect to the server
    try {
      const protocol = smtp_secure ? 'smtps:' : 'smtp:';
      const url = `${protocol}//${smtp_host}:${smtp_port}`;
      
      console.log(`Attempting to connect to ${url}`);
      
      // For security reasons, we'll do a basic connectivity test
      // In a real implementation, you might want to use a proper SMTP library
      // like nodemailer, but Deno edge functions have limitations
      
      // Simple socket connection test
      const conn = await Deno.connect({
        hostname: smtp_host,
        port: smtp_port,
      });
      
      // Read the initial server response
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      const response = new TextDecoder().decode(buffer.subarray(0, bytesRead || 0));
      
      console.log('Server response:', response);
      
      // Close the connection
      conn.close();
      
      // Check if we got a proper SMTP greeting (usually starts with 220)
      if (response.startsWith('220')) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Successfully connected to SMTP server!' 
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Unexpected server response: ${response.substring(0, 100)}` 
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
      
    } catch (connectionError: any) {
      console.error('Connection error:', connectionError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to connect to SMTP server: ${connectionError.message}` 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

  } catch (error: any) {
    console.error('Error in test-email-connection function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Server error: ${error.message}` 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);