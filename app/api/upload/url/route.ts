import { NextResponse } from "next/server";
import { chunker, store } from "../../_state";
import { settings } from "@/lib/settings";
import { YoutubeTranscript } from "youtube-transcript";

export const runtime = "nodejs";

type UrlUpload = { url: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as UrlUpload;
  const url = (body.url || "").trim();
  if (!url) return NextResponse.json({ detail: "url is required" }, { status: 400 });

  try {
    if (!settings.ENABLE_YOUTUBE) {
      return NextResponse.json({ detail: "YouTube processing is disabled by settings." }, { status: 400 });
    }
    if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      return NextResponse.json({ detail: "Only YouTube URLs are supported here." }, { status: 400 });
    }
    const transcript = await YoutubeTranscript.fetchTranscript(url).catch(() => [] as { text: string }[]);
    if (!transcript.length) {
      return NextResponse.json({ detail: "No transcript available for this video." }, { status: 400 });
    }
    const text = transcript.map(t => t.text).join(" ");
    const chunks = chunker.chunkBySentences(text);
    await store.addDocuments(chunks);
    return NextResponse.json({ url, total_chunks: chunks.length, message: `YouTube transcript processed. ${chunks.length} chunks created.` });
  } catch (e: any) {
    return NextResponse.json({ detail: `Error processing URL: ${e.message || e}` }, { status: 500 });
  }
}


