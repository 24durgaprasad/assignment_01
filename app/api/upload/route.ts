import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { processDocument } from "@/lib/documentProcessor";
import { chunker, store } from "../_state";
import { settings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ detail: "file is required" }, { status: 400 });

  const ext = (file.name || "").toLowerCase().slice(file.name.lastIndexOf("."));
  const allowed = [".pdf", ".txt", ".text", ".bxt", ".md", ".markdown", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".mp3", ".mp4", ".wav", ".m4a"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ detail: `Unsupported file type. Allowed: ${allowed.join(", ")}` }, { status: 400 });
  }

  if (file.size / (1024 * 1024) > settings.MAX_FILE_SIZE_MB) {
    return NextResponse.json({ detail: `File too large. Maximum size: ${settings.MAX_FILE_SIZE_MB}MB` }, { status: 400 });
  }

  const tmp = await writeTempFile(file);
  try {
    const text = await processDocument(tmp);
    if (!text.trim()) {
      return NextResponse.json({ detail: "No text could be extracted from the document" }, { status: 400 });
    }
    const chunks = chunker.chunkBySentences(text);
    await store.addDocuments(chunks);
    return NextResponse.json({ filename: file.name, total_chunks: chunks.length, message: `Document processed successfully. ${chunks.length} chunks created.` });
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

