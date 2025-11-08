import { NextResponse } from "next/server";
import { store, sessions, mediaFiles } from "../_state";
import { settings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const stats = store.getStats();
  const mediaFileList = Array.from(mediaFiles.entries()).map(([id, media]) => ({
    id,
    type: media.type,
    originalName: media.originalName,
    mimeType: media.mimeType,
  }));
  
  return NextResponse.json({
    vector_store: stats,
    active_sessions: sessions.size,
    media_files: {
      count: mediaFiles.size,
      files: mediaFileList,
    },
    debug: {
      chunks_in_memory: stats.total_chunks,
      embeddings_in_memory: stats.index_size,
      has_mongo_connection: settings.MONGODB_URI ? "configured" : "not configured",
    },
    settings: {
      max_chunk_size: settings.MAX_CHUNK_SIZE,
      chunk_overlap: settings.CHUNK_OVERLAP,
      embedding_model: settings.EMBEDDING_MODEL,
      gemini_model: settings.GEMINI_MODEL,
      enable_ocr: settings.ENABLE_OCR,
      enable_youtube: settings.ENABLE_YOUTUBE,
      mongodb_uri: settings.MONGODB_URI ? "***configured***" : "not configured",
      mongodb_db_name: settings.MONGODB_DB_NAME,
      gemini_api_key_present: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 0),
    },
  });
}

