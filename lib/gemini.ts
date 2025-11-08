import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, settings } from "./settings";
import fs from "node:fs/promises";
import path from "node:path";

export function buildRagPrompt(query: string, relevant: { text?: string }[], history?: { role: string; content: string }[]) {
  const contexts = relevant.map((c, i) => `[Context ${i + 1}]:\n${c.text || ""}\n`).join("\n");
  const hist = (history || []).slice(-5).map(m => `${capitalize(m.role)}: ${m.content}`).join("\n");
  return `${SYSTEM_PROMPT}

DOCUMENT CONTEXT:
${contexts}

${hist ? `CONVERSATION HISTORY:\n${hist}\n\n` : ""}USER QUESTION:
${query}

ANSWER:`;
}

export async function generateWithGemini(
  prompt: string, 
  mediaFiles?: { filePath: string; mimeType: string }[]
): Promise<string> {
  if (!settings.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }
  const genai = new GoogleGenerativeAI(settings.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({ model: settings.GEMINI_MODEL });
  
  // Build parts array: text + media files
  const parts: any[] = [{ text: prompt }];
  
  // Add media files (images/videos) to the prompt
  if (mediaFiles && mediaFiles.length > 0) {
    for (const media of mediaFiles) {
      try {
        const fileData = await fs.readFile(media.filePath);
        const base64Data = fileData.toString('base64');
        parts.push({
          inline_data: {
            mime_type: media.mimeType,
            data: base64Data
          }
        });
      } catch (e) {
        console.warn(`Failed to read media file ${media.filePath}:`, e);
      }
    }
  }
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts }] 
  });
  const text = result.response.text();
  return text;
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function getMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'application/octet-stream';
}

