import { NextResponse } from "next/server";
import { sessions, store, mediaFiles } from "../_state";
import { buildRagPrompt, generateWithGemini } from "@/lib/gemini";
import { extractVideoFrames } from "@/lib/documentProcessor";
import fs from "node:fs/promises";

type ChatRequest = { session_id: string; query: string; top_k?: number };

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ChatRequest;
  const { session_id, query, top_k = 5 } = body;
  if (!query || !query.trim()) return NextResponse.json({ detail: "Query cannot be empty" }, { status: 400 });

  if (!sessions.has(session_id)) {
    sessions.set(session_id, []);
  }

  const history = sessions.get(session_id)!;
  history.push({ role: "user", content: query });

  try {
    // Collect all media files (images/videos) for visual analysis
    const mediaToInclude: { filePath: string; mimeType: string }[] = [];
    for (const [id, media] of mediaFiles.entries()) {
      if (media.type === "image" || media.type === "video") {
        mediaToInclude.push({ filePath: media.filePath, mimeType: media.mimeType });
      }
    }

    // If we have media files, always use them with Gemini Vision
    if (mediaToInclude.length > 0) {
      // For videos, extract frames
      const finalMediaFiles: { filePath: string; mimeType: string }[] = [];
      for (const media of mediaToInclude) {
        if (media.mimeType.startsWith('video/')) {
          try {
            const frames = await extractVideoFrames(media.filePath, 5);
            // Convert frames to base64 and add as images
            for (const framePath of frames) {
              try {
                const frameData = await fs.readFile(framePath);
                const base64Data = frameData.toString('base64');
                // Create temporary file reference for Gemini
                finalMediaFiles.push({ 
                  filePath: framePath, 
                  mimeType: 'image/jpeg' 
                });
              } catch (e) {
                console.warn("Failed to read video frame:", e);
              }
            }
          } catch (e) {
            console.warn("Failed to extract video frames, using video file directly:", e);
            finalMediaFiles.push(media);
          }
        } else {
          finalMediaFiles.push(media);
        }
      }
      
      // Build prompt with context if available
      let prompt = query;
      const stats = store.getStats();
      if (stats.index_size > 0) {
        const results = await store.search(query, top_k);
        if (results.length > 0) {
          const contexts = results.map((c, i) => `[Context ${i + 1}]:\n${c.chunk.text || ""}\n`).join("\n");
          const hist = history.slice(-5).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
          prompt = `${hist ? `CONVERSATION HISTORY:\n${hist}\n\n` : ""}USER QUESTION: ${query}\n\nDOCUMENT CONTEXT:\n${contexts}\n\nANSWER:`;
        }
      } else {
        // No text context, but we have media - use simple prompt
        const hist = history.slice(-5).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
        prompt = `${hist ? `CONVERSATION HISTORY:\n${hist}\n\n` : ""}USER QUESTION: ${query}\n\nPlease analyze the ${finalMediaFiles.length > 1 ? `${finalMediaFiles.length} images/frames` : "image/frame"} provided and answer based on what you see.\n\nANSWER:`;
      }
      
      const answer = await generateWithGemini(prompt, finalMediaFiles.length > 0 ? finalMediaFiles : mediaToInclude);
      history.push({ role: "assistant", content: answer });
      return NextResponse.json({ 
        session_id, 
        query, 
        response: answer, 
        relevant_chunks: [], 
        chunk_count: 0,
        media_analyzed: mediaToInclude.length
      });
    }

    // Fallback to text-only RAG if no media files
    if (store.getStats().index_size === 0) {
      return NextResponse.json({ detail: "No documents uploaded. Please upload a document first." }, { status: 400 });
    }

    const results = await store.search(query, top_k);
    if (!results.length) {
      return NextResponse.json({ session_id, query, response: "I couldn't find relevant information in the document to answer your question.", relevant_chunks: [], chunk_count: 0 });
    }
    const prompt = buildRagPrompt(query, results.map(r => ({ text: r.chunk.text })), history);
    const answer = await generateWithGemini(prompt);
    history.push({ role: "assistant", content: answer });
    const chunk_info = results.map(r => ({ id: r.chunk.id, text: r.chunk.text.length > 200 ? r.chunk.text.slice(0, 200) + "..." : r.chunk.text, score: r.score }));
    return NextResponse.json({ session_id, query, response: answer, relevant_chunks: chunk_info, chunk_count: results.length });
  } catch (e: any) {
    return NextResponse.json({ detail: `Error generating response: ${e.message || e}` }, { status: 500 });
  }
}

