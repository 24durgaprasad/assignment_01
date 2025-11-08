import { NextResponse } from "next/server";
import { sessions, store, mediaFiles } from "../_state";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    // Clear vector store
    await store.clear();
    
    // Clear sessions
    sessions.clear();
    
    // Clear media files map
    mediaFiles.clear();
    
    // Clear uploaded files from disk
    const uploadsDir = path.join(process.cwd(), "uploads");
    try {
      const files = await fs.readdir(uploadsDir);
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(uploadsDir, file)).catch(() => {})
        )
      );
    } catch (e) {
      // Uploads directory might not exist, that's okay
    }
    
    return NextResponse.json({ message: "All data cleared successfully" });
  } catch (e: any) {
    return NextResponse.json({ 
      message: "Error clearing data", 
      error: e.message 
    }, { status: 500 });
  }
}

