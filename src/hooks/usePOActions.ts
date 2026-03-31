import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

      // Render HTML into a hidden container
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "794px"; // A4 width at 96dpi
      container.style.background = "white";
      container.innerHTML = data.html;
      document.body.appendChild(container);

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      document.body.removeChild(container);

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL("image/png");

      // First page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Download the PDF
      const fileName = `PO-${data.po_number || poId}.pdf`;
      pdf.save(fileName);

      // Also open in new tab for viewing
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, "_blank");

      toast({
        title: "Purchase Order Downloaded",
        description: `${fileName} has been downloaded and opened in a new tab.`,
      });

      return data;
    } catch (error: any) {
      console.error("PO PDF generation error:", error);
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
      let html = pdfHtml;
      if (!html) {
        const { data, error } = await supabase.functions.invoke("generate-po-pdf", {
          body: { po_id: poId },
        });
        if (error) throw error;
        html = data.html;
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
