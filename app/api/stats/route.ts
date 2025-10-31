import { NextResponse } from "next/server";
import { store, sessions } from "../_state";
import { settings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    vector_store: store.getStats(),
    active_sessions: sessions.size,
    settings: {
      max_chunk_size: settings.MAX_CHUNK_SIZE,
      chunk_overlap: settings.CHUNK_OVERLAP,
      embedding_model: settings.EMBEDDING_MODEL,
      gemini_model: settings.GEMINI_MODEL,
      enable_ocr: settings.ENABLE_OCR,
      enable_youtube: settings.ENABLE_YOUTUBE,
      sqlite_path: process.env.SQLITE_PATH || "./data/index.sqlite",
      gemini_api_key_present: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 0),
    },
  });
}

