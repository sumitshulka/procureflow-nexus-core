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

    // Minimal SMTP client using Deno net/TLS to avoid incompatibilities
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const writeLine = async (conn: Deno.Conn, line: string) => {
      await conn.write(encoder.encode(line + "\r\n"));
    };

    const readResponse = async (conn: Deno.Conn): Promise<string> => {
      let resp = "";
      const buf = new Uint8Array(4096);
      while (true) {
        const n = await conn.read(buf);
        if (n === null) break;
        resp += decoder.decode(buf.subarray(0, n));
        // Stop when we have a line ending with status code + space (end of multiline response)
        const lines = resp.split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1] || "";
        if (/^\d{3} /.test(last)) break;
        // Some servers send single-line responses quickly
        if (resp.endsWith("\r\n")) {
          const anyLineEnd = lines.find((l) => /^\d{3} /.test(l));
          if (anyLineEnd) break;
        }
      }
      return resp;
    };

    const expectCode = (resp: string, code: number) => {
      const firstLine = (resp.split(/\r?\n/).find(Boolean)) || resp;
      if (!firstLine.startsWith(String(code))) {
        throw new Error(`SMTP ${code} expected, got: ${firstLine}`);
      }
    };

    let conn: Deno.Conn | Deno.TlsConn;
    if (secure && port === 465) {
      conn = await Deno.connectTls({ hostname: host, port });
    } else {
      conn = await Deno.connect({ hostname: host, port });
    }

    // Server greeting
    let resp = await readResponse(conn);

    // Say hello
    await writeLine(conn, `EHLO ${host}`);
    resp = await readResponse(conn);
    expectCode(resp, 250);

    // If secure is requested and not implicit TLS (465), upgrade via STARTTLS
    if (secure && port !== 465) {
      await writeLine(conn, "STARTTLS");
      resp = await readResponse(conn);
      expectCode(resp, 220);
      conn = await Deno.startTls(conn as Deno.Conn, { hostname: host });
      await writeLine(conn, `EHLO ${host}`);
      resp = await readResponse(conn);
      expectCode(resp, 250);
    }

    // AUTH LOGIN
    await writeLine(conn, "AUTH LOGIN");
    resp = await readResponse(conn);
    expectCode(resp, 334);
    await writeLine(conn, btoa(username));
    resp = await readResponse(conn);
    expectCode(resp, 334);
    await writeLine(conn, btoa(password));
    resp = await readResponse(conn);
    expectCode(resp, 235);

    // MAIL transaction
    await writeLine(conn, `MAIL FROM:<${fromEmail}>`);
    resp = await readResponse(conn);
    expectCode(resp, 250);

    await writeLine(conn, `RCPT TO:<${to}>`);
    resp = await readResponse(conn);
    expectCode(resp, 250);

    await writeLine(conn, "DATA");
    resp = await readResponse(conn);
    expectCode(resp, 354);

    const fromHeader = `${fromName} <${fromEmail}>`;
    const headers = [
      `From: ${fromHeader}`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      html ? "Content-Type: text/html; charset=UTF-8" : "Content-Type: text/plain; charset=UTF-8",
      "",
    ].join("\r\n");

    const bodyContent = (html || text || "").replace(/\n/g, "\r\n");
    await writeLine(conn, headers + bodyContent + "\r\n.\r\n");
    resp = await readResponse(conn);
    expectCode(resp, 250);

    await writeLine(conn, "QUIT");
    await readResponse(conn);
    conn.close();

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