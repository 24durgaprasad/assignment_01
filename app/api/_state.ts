import { settings } from "@/lib/settings";
import { TextChunker } from "@/lib/textChunker";
import { VectorStore } from "@/lib/vectorStore";
import path from "node:path";
import fs from "node:fs";

export type ChatMessage = { role: "user" | "assistant"; content: string };

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

