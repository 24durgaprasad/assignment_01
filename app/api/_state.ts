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

// Use global to ensure singleton across Next.js hot reloads
declare global {
  var __vectorStore: VectorStore | undefined;
  var __sessions: Map<string, ChatMessage[]> | undefined;
  var __mediaFiles: Map<string, MediaFile> | undefined;
}

// Initialize VectorStore with MongoDB (singleton pattern for Next.js)
if (!global.__vectorStore) {
  console.log("Initializing new VectorStore instance...");
  global.__vectorStore = new VectorStore(
    settings.EMBEDDING_MODEL,
    settings.MONGODB_URI,
    settings.MONGODB_DB_NAME
  );
}

if (!global.__sessions) {
  global.__sessions = new Map<string, ChatMessage[]>();
}

if (!global.__mediaFiles) {
  global.__mediaFiles = new Map<string, MediaFile>();
}

export const store = global.__vectorStore;
export const sessions = global.__sessions;
export const mediaFiles = global.__mediaFiles;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {}

