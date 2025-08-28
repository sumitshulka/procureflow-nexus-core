import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  smtp_host: string;
  smtp_port: number;
  smtp_secure?: boolean;
  username?: string;
  password?: string;
  from_email?: string;
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
    const { smtp_host, smtp_port }: TestEmailRequest = await req.json();

    // Validate minimal required fields
    if (!smtp_host || !smtp_port) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: smtp_host and smtp_port are required' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Try to open a TCP connection to the SMTP host/port
    try {
      const conn = await Deno.connect({ hostname: smtp_host, port: smtp_port });
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      const response = new TextDecoder().decode(buffer.subarray(0, bytesRead || 0));
      conn.close();

      const ok = response.startsWith('220');
      return new Response(
        JSON.stringify({ 
          success: ok, 
          message: ok ? 'Successfully connected to SMTP server' : `Unexpected server response: ${response.substring(0, 100)}`
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (connectionError: any) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to connect to SMTP server: ${connectionError?.message || 'Unknown error'}` 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Server error: ${error.message}` 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);