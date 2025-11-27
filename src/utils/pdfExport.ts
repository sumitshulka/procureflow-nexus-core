import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PDFExportOptions {
  title: string;
  data: any[];
  columns: { header: string; dataKey: string }[];
  organizationName?: string;
  baseCurrency?: string;
  valuationMethod?: string;
  totalValue?: number;
}

export const exportInventoryReportToPDF = ({
  title,
  data,
  columns,
  organizationName = "Organization",
  baseCurrency = "USD",
  valuationMethod = "Weighted Average",
  totalValue = 0,
}: PDFExportOptions) => {
  // Determine orientation based on number of columns
  const orientation = columns.length > 5 ? "landscape" : "portrait";
  
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add company branding/header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(organizationName, pageWidth / 2, 15, { align: "center" });

  // Add report title
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 25, { align: "center" });

  // Add date and valuation method info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const currentDate = new Date().toLocaleDateString();
  doc.text(`Generated on: ${currentDate}`, 14, 35);
  doc.text(`Valuation Method: ${valuationMethod}`, 14, 40);

  // Add summary box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 45, pageWidth - 28, 15, 2, 2, "FD");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Items: ${data.length}`, 18, 52);
  doc.text(`Total Value: ${baseCurrency} ${totalValue.toLocaleString()}`, 18, 57);

  // Add table
  autoTable(doc, {
    startY: 65,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.dataKey])),
    theme: "grid",
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [249, 249, 249],
    },
    margin: { top: 65, left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        `© ${new Date().getFullYear()} ${organizationName}`,
        14,
        pageHeight - 10
      );
    },
  });

  // Save the PDF
  const fileName = `${title.toLowerCase().replace(/\s+/g, "-")}-${currentDate.replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
};
