import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Gemini Document Chat API (Next.js)",
    version: "1.0.0",
    endpoints: {
      upload: "/api/upload",
      chat: "/api/chat",
      session: "/api/session/new",
      stats: "/api/stats",
    },
  });
}

