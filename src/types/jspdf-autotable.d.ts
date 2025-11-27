declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";

  interface ColumnInput {
    header: string;
    dataKey: string;
  }

  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    theme?: "striped" | "grid" | "plain";
    headStyles?: any;
    bodyStyles?: any;
    alternateRowStyles?: any;
    margin?: { top?: number; left?: number; right?: number; bottom?: number };
    didDrawPage?: (data: any) => void;
  }

  export default function autoTable(
    doc: jsPDF,
    options: AutoTableOptions
  ): jsPDF;
}
