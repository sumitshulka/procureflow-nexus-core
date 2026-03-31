import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const waitForImages = async (doc: Document) => {
  const images = Array.from(doc.images || []);
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
};

export const usePOActions = () => {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const generatePDF = async (poId: string) => {
    setIsGeneratingPDF(true);

    let previewWindow: Window | null = null;

    try {
      previewWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!previewWindow) {
        throw new Error("Popup was blocked. Please allow popups and try again.");
      }

      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Generating Purchase Order...</title>
            <style>
              body {
                margin: 0;
                font-family: Arial, sans-serif;
                background: #f8fafc;
                color: #0f172a;
                display: grid;
                place-items: center;
                min-height: 100vh;
              }
              .status {
                text-align: center;
                padding: 32px;
              }
            </style>
          </head>
          <body>
            <div class="status">
              <h2>Preparing purchase order…</h2>
              <p>Please wait while the PDF is generated.</p>
            </div>
          </body>
        </html>
      `);
      previewWindow.document.close();

      const { data, error } = await supabase.functions.invoke("generate-po-pdf", {
        body: { po_id: poId },
      });

      if (error) throw error;
      if (!data?.html) throw new Error("No purchase order content was returned.");

      previewWindow.document.open();
      previewWindow.document.write(data.html);
      previewWindow.document.close();

      await new Promise((resolve) => setTimeout(resolve, 400));
      await waitForImages(previewWindow.document);

      const target = previewWindow.document.body;
      if (!target) {
        throw new Error("Unable to render purchase order preview.");
      }

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: Math.max(target.scrollWidth, 1024),
        windowHeight: Math.max(target.scrollHeight, 1448),
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `PO-${data.po_number || poId}.pdf`;
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      previewWindow.location.href = blobUrl;

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

      toast({
        title: "Purchase Order Ready",
        description: `${fileName} was opened in a new tab and download was triggered.`,
      });

      return data;
    } catch (error: any) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }

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
