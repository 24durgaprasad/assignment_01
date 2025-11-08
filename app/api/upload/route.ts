import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { processDocument } from "@/lib/documentProcessor";
import { chunker, store, mediaFiles } from "../_state";
import { settings } from "@/lib/settings";
import { getMimeType } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("=== UPLOAD REQUEST START ===");
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    console.error("No file in upload request");
    return NextResponse.json({ detail: "file is required" }, { status: 400 });
  }
  
  console.log(`Upload request for file: ${file.name}, size: ${file.size} bytes`);

  const ext = (file.name || "").toLowerCase().slice(file.name.lastIndexOf("."));
  const allowed = [".pdf", ".txt", ".text", ".bxt", ".md", ".markdown", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".mp3", ".mp4", ".wav", ".m4a"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ detail: `Unsupported file type. Allowed: ${allowed.join(", ")}` }, { status: 400 });
  }

  if (file.size / (1024 * 1024) > settings.MAX_FILE_SIZE_MB) {
    return NextResponse.json({ detail: `File too large. Maximum size: ${settings.MAX_FILE_SIZE_MB}MB` }, { status: 400 });
  }

  const tmp = await writeTempFile(file);
  const isImage = [".png", ".jpg", ".jpeg"].includes(ext);
  const isVideo = [".mp4"].includes(ext);
  const isAudio = [".mp3", ".wav", ".m4a"].includes(ext);
  
  try {
    // For images and videos, store the file permanently and use Gemini Vision
    if (isImage || isVideo) {
      const uploadsDir = path.join(process.cwd(), "uploads");
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
      } catch {}
      
      const mediaId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storedPath = path.join(uploadsDir, `${mediaId}${ext}`);
      await fs.copyFile(tmp, storedPath);
      
      const mimeType = getMimeType(storedPath);
      mediaFiles.set(mediaId, {
        id: mediaId,
        filePath: storedPath,
        mimeType,
        originalName: file.name,
        type: isImage ? "image" : "video"
      });
      
      // For videos, also extract audio transcript for text search
      let text = "";
      if (isVideo) {
        try {
          text = await processDocument(tmp);
        } catch (e) {
          console.warn("Failed to extract audio from video:", e);
        }
        // Note: Video frames will be extracted and sent to Gemini Vision during chat queries
      }
      
      // For images, we still do OCR as fallback for text search, but primary analysis will be via Vision
      if (isImage && settings.ENABLE_OCR) {
        try {
          const ocrText = await processDocument(tmp);
          if (ocrText && ocrText.trim()) {
            text = `[Image: ${file.name}]\n${ocrText.trim()}`;
            console.log(`OCR extracted ${ocrText.length} characters from image ${file.name}`);
          }
        } catch (e) {
          console.warn("OCR failed, will use Vision API only:", e);
        }
      }
      
      // Add text chunks if available (OCR text for images, audio transcript for videos)
      // Main analysis will be via Vision API, but text chunks help with search
      if (text && text.trim()) {
        const chunks = chunker.chunkBySentences(text.trim());
        if (chunks.length > 0) {
          await store.addDocuments(chunks);
          console.log(`Created ${chunks.length} text chunks from ${isImage ? "image OCR" : "video audio"}`);
        }
        return NextResponse.json({ 
          filename: file.name, 
          total_chunks: chunks.length, 
          media_id: mediaId,
          message: `${isImage ? "Image" : "Video"} processed successfully. ${chunks.length > 0 ? `${chunks.length} text chunks created. ` : ""}Ready for visual analysis!` 
        });
      } else {
        return NextResponse.json({ 
          filename: file.name, 
          total_chunks: 0,
          media_id: mediaId,
          message: `${isImage ? "Image" : "Video"} uploaded successfully. Ready for visual analysis!` 
        });
      }
    } else {
      // For other file types (PDF, TXT, etc.), process normally
      let text = "";
      try {
        text = await processDocument(tmp);
        console.log(`Extracted text length: ${text.length} characters from ${file.name}`);
      } catch (error: any) {
        console.error(`Error processing document ${file.name}:`, error);
        return NextResponse.json({ 
          detail: `Error processing document: ${error.message || "Failed to extract text"}` 
        }, { status: 500 });
      }
      
      if (!text || !text.trim()) {
        return NextResponse.json({ 
          detail: "No text could be extracted from the document. The file might be empty, corrupted, or in an unsupported format." 
        }, { status: 400 });
      }
      
      // Clean and chunk the text
      const cleanedText = text.trim().replace(/\s+/g, " ");
      const chunks = chunker.chunkBySentences(cleanedText);
      
      if (chunks.length === 0) {
        return NextResponse.json({ 
          detail: "No valid chunks could be created from the document text." 
        }, { status: 400 });
      }
      
      console.log(`Created ${chunks.length} chunks from ${file.name}`);
      await store.addDocuments(chunks);
      
      // Verify chunks were added
      const statsAfter = store.getStats();
      console.log(`After adding chunks - Total chunks in store: ${statsAfter.total_chunks}, Index size: ${statsAfter.index_size}`);
      
      if (statsAfter.total_chunks === 0) {
        console.error("WARNING: Chunks were not added to store!");
        return NextResponse.json({ 
          detail: "Error: Chunks were created but not added to the store. Please try uploading again." 
        }, { status: 500 });
      }
      
      console.log(`=== UPLOAD SUCCESS === File: ${file.name}, Chunks in store: ${statsAfter.total_chunks}`);
      
      return NextResponse.json({ 
        filename: file.name, 
        total_chunks: statsAfter.total_chunks, 
        message: `Document processed successfully. ${chunks.length} chunks created and indexed. Total chunks in store: ${statsAfter.total_chunks}` 
      });
    }
  } catch (e: any) {
    return NextResponse.json({ detail: `Error processing document: ${e.message || e}` }, { status: 500 });
  } finally {
    try { await fs.unlink(tmp); } catch {}
  }
}

async function writeTempFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = path.join(os.tmpdir(), `${Date.now()}_${file.name}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

