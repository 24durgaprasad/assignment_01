import fs from "node:fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import removeMarkdown from "remove-markdown";
import JSZip from "jszip";
import Tesseract from "tesseract.js";
import { settings } from "./settings";
import ffmpegPath from "ffmpeg-static";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { pipeline as hfPipeline } from "@xenova/transformers";

const execFile = promisify(execFileCb);

export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath);
    const res = await pdf(data, {
      // Options for better text extraction
      max: 0, // Parse all pages
    });
    
    let extractedText = res.text || "";
    
    // If no text found, try to extract from info or metadata
    if (!extractedText || extractedText.trim().length === 0) {
      console.warn("No text extracted from PDF, might be scanned/image-based PDF");
      // Could try OCR here if needed, but for now just return empty
    }
    
    return extractedText;
  } catch (e: any) {
    console.error(`PDF extraction error for ${filePath}:`, e);
    throw new Error(`Error extracting text from PDF: ${e.message || e}`);
  }
}

export async function extractTextFromTxt(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, { encoding: "utf-8" });
    return content;
  } catch (e: any) {
    const content = await fs.readFile(filePath, { encoding: "latin1" });
    return content;
  }
}

export function cleanText(text: string): string {
  if (!text) return "";
  // Remove excessive whitespace, normalize line breaks, and trim
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\s+/)
    .join(" ")
    .trim();
}

export async function processDocument(filePath: string): Promise<string> {
  const lower = filePath.toLowerCase();
  let text = "";
  if (lower.endsWith('.pdf')) {
    text = await extractTextFromPdf(filePath);
  } else if (lower.endsWith('.txt') || lower.endsWith('.text') || lower.endsWith('.bxt')) {
    text = await extractTextFromTxt(filePath);
  } else if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    const raw = await extractTextFromTxt(filePath);
    text = removeMarkdown(raw);
  } else if (lower.endsWith('.docx')) {
    try {
      const data = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: data });
      text = result.value || "";
    } catch (e: any) {
      throw new Error(`Error extracting text from DOCX: ${e.message || e}`);
    }
  } else if (lower.endsWith('.pptx')) {
    try {
      const data = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(data);
      const slideFiles = Object.keys(zip.files).filter((p) => p.startsWith('ppt/slides/slide') && p.endsWith('.xml'));
      const contents = await Promise.all(slideFiles.map(async (p) => {
        const file = zip.file(p);
        if (!file) return "";
        const xml = await file.async('text');
        return xml.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      }));
      text = contents.join('\n');
    } catch (e: any) {
      throw new Error(`Error extracting text from PPTX: ${e.message || e}`);
    }
  } else {
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      if (!settings.ENABLE_OCR) {
        throw new Error("OCR is disabled by settings.");
      }
      try {
        const result = await Tesseract.recognize(filePath, 'eng');
        text = result.data.text || "";
      } catch (e: any) {
        throw new Error(`Error extracting text from image: ${e.message || e}`);
      }
    } else if (lower.endsWith('.mp3') || lower.endsWith('.mp4') || lower.endsWith('.wav') || lower.endsWith('.m4a')) {
      const wavPath = await ensureWavMono16k(filePath);
      const asr = await hfPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
      const result: any = await asr(wavPath, { chunk_length_s: 30 });
      text = result?.text || '';
    } else {
    throw new Error(`Unsupported file type: ${filePath}`);
    }
  }
  return cleanText(text);
}

async function ensureWavMono16k(inputPath: string): Promise<string> {
  if (!ffmpegPath) throw new Error('ffmpeg not available');
  const out = path.join(os.tmpdir(), `${Date.now()}_audio.wav`);
  await execFile(ffmpegPath as string, [
    '-y',
    '-i', inputPath,
    '-ac', '1',
    '-ar', '16000',
    '-f', 'wav',
    out,
  ]);
  return out;
}

export async function extractVideoFrames(videoPath: string, maxFrames: number = 5): Promise<string[]> {
  if (!ffmpegPath) throw new Error('ffmpeg not available');
  
  const framePaths: string[] = [];
  const baseTimestamp = Date.now();
  
  // Extract frames at intervals (start, middle, end)
  // Extract frames at: 0%, 25%, 50%, 75%, 100% of video (or maxFrames evenly spaced)
  for (let i = 0; i < maxFrames; i++) {
    const framePath = path.join(os.tmpdir(), `${baseTimestamp}_frame_${i}.jpg`);
    
    try {
      // Use percentage-based extraction for better coverage
      // -ss seeks to timestamp, then extract one frame
      // We'll extract frames at regular intervals (every 10 seconds or evenly distributed)
      const timestamp = i * 10; // Extract every 10 seconds
      
      await execFile(ffmpegPath as string, [
        '-y',
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2', // High quality
        '-vf', 'scale=800:-1', // Resize for efficiency
        framePath,
      ], { timeout: 15000 });
      
      // Check if frame file was created and has content
      try {
        const stats = await fs.stat(framePath);
        if (stats.size > 0) {
          framePaths.push(framePath);
        }
      } catch {
        // Frame not created or empty, skip
      }
    } catch (e) {
      console.warn(`Failed to extract frame ${i} at ${i * 10}s:`, e);
      // Continue with next frame
    }
  }
  
  return framePaths;
}

