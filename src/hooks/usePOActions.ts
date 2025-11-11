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

      // Create a blob from the HTML and trigger download
      const blob = new Blob([data.html], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PO-${data.po_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PO downloaded successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
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
      // First generate PDF if not provided
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
