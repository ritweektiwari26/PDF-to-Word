
export enum ConversionTarget {
  WORD = 'WORD',
  EXCEL = 'EXCEL'
}

export interface ConversionStatus {
  step: string;
  progress: number;
  isProcessing: boolean;
  error?: string;
}

export interface DocumentPage {
  index: number;
  dataUrl: string;
}

export interface TableData {
  headers: string[];
  rows: any[][];
}

export interface ExtractedContent {
  text?: string;
  tables?: TableData[];
}
