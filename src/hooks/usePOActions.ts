import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePOActions = () => {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const generatePDF = async (poId: string) => {
    setIsGeneratingPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-po-pdf", {
        body: { po_id: poId },
      });

      if (error) throw error;

      // Open the PO in a new tab for viewing/printing
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(data.html);
        newWindow.document.close();
        // Add a print button to the opened window
        const printBtn = newWindow.document.createElement("div");
        printBtn.innerHTML = `
          <div style="position:fixed;top:10px;right:10px;z-index:9999;display:flex;gap:8px;">
            <button onclick="window.print()" style="padding:10px 20px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
              🖨️ Print / Save as PDF
            </button>
          </div>
        `;
        newWindow.document.body.appendChild(printBtn);
      } else {
        // Fallback: download as HTML file
        const blob = new Blob([data.html], { type: "text/html" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `PO-${data.po_number}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Purchase Order Generated",
        description: "The PO has been opened in a new tab. Use 'Print / Save as PDF' to download.",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PO",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sendEmail = async (poId: string, pdfHtml?: string) => {
    setIsSendingEmail(true);
    try {
      let html = pdfHtml;
      if (!html) {
        const pdfData = await generatePDF(poId);
        html = pdfData.html;
      }

      const { data, error } = await supabase.functions.invoke("send-po-email", {
        body: { po_id: poId, pdf_html: html },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Email sent to ${data.recipient}`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSendingEmail(false);
    }
  };

  return {
    generatePDF,
    sendEmail,
    isGeneratingPDF,
    isSendingEmail,
  };
};
