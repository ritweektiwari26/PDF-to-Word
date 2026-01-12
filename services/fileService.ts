
import { DocumentPage, TableData } from "../types";
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// Setup PDF.js worker from the global script
// @ts-ignore
const pdfjsLib = window.pdfjsLib;
if (pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * Reads a file as a data URL. Useful for images.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractPagesAsImages = async (file: File): Promise<DocumentPage[]> => {
  if (!pdfjsLib) throw new Error("PDF.js library not loaded");
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: DocumentPage[] = [];

  // Limit to 10 pages for stability and performance
  const pagesToProcess = Math.min(pdf.numPages, 10);

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({
      index: i,
      dataUrl: canvas.toDataURL('image/png')
    });
  }

  return pages;
};

export const generateExcel = (tables: TableData[], filename: string) => {
  const wb = XLSX.utils.book_new();

  if (tables.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["No tables found by AI"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Info");
  } else {
    tables.forEach((table, index) => {
      const data = [table.headers, ...table.rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, `Table ${index + 1}`);
    });
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const generateWord = async (markdownText: string, filename: string) => {
  const lines = markdownText.split('\n');
  const children: Paragraph[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed && children.length > 0) {
      children.push(new Paragraph({ children: [] }));
      return;
    }

    if (line.startsWith('# ')) {
      children.push(new Paragraph({ 
        text: line.replace('# ', ''), 
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 }
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({ 
        text: line.replace('## ', ''), 
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({ 
        text: line.replace('### ', ''), 
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 90 }
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({
        children: [new TextRun(line.substring(2))],
        bullet: { level: 0 }
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 120 }
      }));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children.length > 0 ? children : [new Paragraph("Document converted by Gemini PDF Pro")]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
};
