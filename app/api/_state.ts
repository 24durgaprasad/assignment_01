import { settings } from "@/lib/settings";
import { TextChunker } from "@/lib/textChunker";
import { VectorStore } from "@/lib/vectorStore";
import path from "node:path";
import fs from "node:fs";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type MediaFile = {
  id: string;
  filePath: string;
  mimeType: string;
  originalName: string;
  type: "image" | "video" | "audio";
};

export const chunker = new TextChunker(settings.MAX_CHUNK_SIZE, settings.CHUNK_OVERLAP);
const defaultDbPath = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "index.sqlite");
try {
  const dir = path.dirname(defaultDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch {}
export const store = new VectorStore(settings.EMBEDDING_MODEL, defaultDbPath);
export const sessions = new Map<string, ChatMessage[]>();
export const mediaFiles = new Map<string, MediaFile>(); // Store media files by ID

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {}

