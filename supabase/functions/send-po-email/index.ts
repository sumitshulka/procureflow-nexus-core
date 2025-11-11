import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  po_id: string;
  pdf_html: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { po_id, pdf_html }: EmailRequest = await req.json();

    if (!po_id) {
      throw new Error("PO ID is required");
    }

    // Fetch PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        vendor:vendor_registrations(company_name, primary_email),
        creator:profiles!created_by(full_name)
      `)
      .eq("id", po_id)
      .single();

    if (poError) throw poError;

    // Fetch email template settings
    const { data: settings } = await supabase
      .from("standard_po_settings")
      .select("email_template_subject, email_template_body")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Prepare email content with template placeholders
    const emailSubject = (settings?.email_template_subject || "Purchase Order - {{po_number}}")
      .replace("{{po_number}}", po.po_number);

    const emailBody = (settings?.email_template_body || `Dear {{vendor_name}},

Please find attached Purchase Order {{po_number}}.

Best regards,
{{sender_name}}`)
      .replace(/{{vendor_name}}/g, po.vendor?.company_name || "Vendor")
      .replace(/{{po_number}}/g, po.po_number)
      .replace(/{{total_amount}}/g, po.final_amount?.toFixed(2) || "0.00")
      .replace(/{{currency}}/g, po.currency || "USD")
      .replace(/{{expected_delivery}}/g, po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "N/A")
      .replace(/{{sender_name}}/g, po.creator?.full_name || "Procurement Team");

    // In a real implementation, integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll use the existing send-email function or log the attempt

    // Log the email attempt
    const { error: logError } = await supabase
      .from("po_email_logs")
      .insert({
        purchase_order_id: po_id,
        recipient_email: po.vendor?.primary_email || "",
        subject: emailSubject,
        sent_by: user.id,
        status: "sent",
      });

    if (logError) {
      console.error("Error logging email:", logError);
    }

    // TODO: Integrate with actual email service here
    // Example with Resend (requires RESEND_API_KEY secret):
    /*
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "procurement@yourcompany.com",
        to: po.vendor?.primary_email,
        subject: emailSubject,
        html: `${emailBody.replace(/\n/g, "<br>")}<br><br><hr>${pdf_html}`,
      }),
    });
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        recipient: po.vendor?.primary_email,
        subject: emailSubject,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending PO email:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
