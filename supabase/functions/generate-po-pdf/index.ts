import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PORequest {
  po_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { po_id }: PORequest = await req.json();

    if (!po_id) {
      throw new Error("PO ID is required");
    }

    // Fetch PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        vendor:vendor_registrations(company_name, primary_email),
        items:purchase_order_items(*)
      `)
      .eq("id", po_id)
      .single();

    if (poError) throw poError;

    // Generate HTML for PDF
    const html = generatePOHTML(po);

    // In a real implementation, you would use a PDF generation library
    // For now, we'll return the HTML that can be converted to PDF on the client side
    // or you can integrate with a service like PDFShift, DocRaptor, etc.

    return new Response(
      JSON.stringify({
        success: true,
        html: html,
        po_number: po.po_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating PO PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generatePOHTML(po: any): string {
  const itemsHTML = po.items.map((item: any, index: number) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">${index + 1}</td>
      <td style="padding: 12px; text-align: left;">${item.description}</td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">${po.currency} ${item.unit_price?.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right;">${po.currency} ${item.total_price?.toFixed(2)}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Order - ${po.po_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { margin-bottom: 30px; }
        .po-title { font-size: 28px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
        .po-number { font-size: 16px; color: #6b7280; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #1e40af; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-weight: bold; color: #4b5563; }
        .info-value { color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 12px; }
        .totals { float: right; width: 300px; margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #1e40af; padding-top: 10px; margin-top: 10px; }
        .terms-section { margin-top: 40px; page-break-before: auto; }
        .terms-content { white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="po-title">PURCHASE ORDER</div>
        <div class="po-number">PO Number: ${po.po_number}</div>
      </div>

      <div class="section">
        <div class="section-title">Order Information</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">PO Date:</span>
              <span class="info-value">${new Date(po.po_date).toLocaleDateString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Expected Delivery:</span>
              <span class="info-value">${po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Payment Terms:</span>
              <span class="info-value">${po.payment_terms || 'N/A'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Vendor:</span>
              <span class="info-value">${po.vendor?.company_name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${po.vendor?.primary_email || 'N/A'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">${po.status.toUpperCase()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Currency:</span>
              <span class="info-value">${po.currency || 'USD'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Order Items</div>
        <table>
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th>#</th>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${po.currency} ${po.total_amount?.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>${po.currency} ${po.tax_amount?.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Discount:</span>
            <span>${po.currency} ${po.discount_amount?.toFixed(2)}</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total:</span>
            <span>${po.currency} ${po.final_amount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      ${po.terms_and_conditions ? `
      <div class="terms-section">
        <div class="section-title">Terms and Conditions</div>
        <div class="terms-content">${po.terms_and_conditions}</div>
      </div>
      ` : ''}

      ${po.specific_instructions ? `
      <div class="terms-section">
        <div class="section-title">Specific Instructions</div>
        <div class="terms-content">${po.specific_instructions}</div>
      </div>
      ` : ''}
    </body>
    </html>
  `;
}
