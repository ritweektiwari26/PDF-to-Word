
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionTarget } from "../types";

export const processPageWithGemini = async (
  imageData: string,
  target: ConversionTarget
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const base64Data = imageData.split(',')[1];
  
  const prompt = target === ConversionTarget.EXCEL 
    ? `Analyze this document page and extract all tabular data into a structured JSON format. 
       Return an array of objects where each object represents a table with 'headers' (array of strings) and 'rows' (array of arrays).
       If no tables exist, return an empty array.
       Focus on accuracy for numbers and financial data.`
    : `Perform a high-fidelity OCR on this document page. 
       Preserve the structure, headers, bullet points, and formatting in Markdown syntax. 
       Include all text content. Focus on maintaining the logical flow of the document.`;

  const schema = target === ConversionTarget.EXCEL ? {
    type: Type.OBJECT,
    properties: {
      tables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["headers", "rows"]
        }
      }
    },
    required: ["tables"]
  } : undefined;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        { text: prompt }
      ]
    },
    config: schema ? {
      responseMimeType: "application/json",
      responseSchema: schema
    } : undefined
  });

  return response.text || '';
};
