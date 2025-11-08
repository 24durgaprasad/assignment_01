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
    
    console.log(`Chat request - Media files: ${mediaToInclude.length}, MediaFiles map size: ${mediaFiles.size}`);

    // Process media files (extract video frames, etc.)
    const finalMediaFiles: { filePath: string; mimeType: string }[] = [];
    for (const media of mediaToInclude) {
      if (media.mimeType.startsWith('video/')) {
        try {
          const frames = await extractVideoFrames(media.filePath, 5);
          for (const framePath of frames) {
            try {
              await fs.access(framePath); // Check if file exists
              finalMediaFiles.push({ 
                filePath: framePath, 
                mimeType: 'image/jpeg' 
              });
            } catch (e) {
              console.warn("Failed to access video frame:", e);
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

    // Get text context from vector store if available
    const stats = store.getStats();
    const hasTextContext = stats.index_size > 0;
    let textResults: { chunk: any; score: number }[] = [];
    
    console.log(`Vector store stats - Total chunks: ${stats.total_chunks}, Index size: ${stats.index_size}, Has text context: ${hasTextContext}`);
    
    if (hasTextContext) {
      textResults = await store.search(query, top_k);
      console.log(`Found ${textResults.length} relevant text chunks for query: "${query}"`);
      if (textResults.length > 0) {
        console.log(`Top result score: ${textResults[0].score}, Text preview: ${textResults[0].chunk.text.substring(0, 100)}...`);
      } else {
        console.warn(`No search results found, but store has ${stats.total_chunks} chunks. This might indicate a search issue.`);
        // Even if no search results, if we have chunks, try to use them with lower threshold
        // For now, we'll proceed with empty results but the user should see a helpful message
      }
    }

    // Build prompt combining text context and media
    let prompt = "";
    const hist = history.slice(-5).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    
    if (textResults.length > 0 && finalMediaFiles.length > 0) {
      // Both text and images available - combine them
      const contexts = textResults.map((c, i) => `[Context ${i + 1}]:\n${c.chunk.text || ""}\n`).join("\n");
      prompt = `${hist ? `CONVERSATION HISTORY:\n${hist}\n\n` : ""}USER QUESTION: ${query}\n\nDOCUMENT CONTEXT (from uploaded documents):\n${contexts}\n\nIMAGES PROVIDED: ${finalMediaFiles.length} ${finalMediaFiles.length === 1 ? 'image' : 'images'} ${finalMediaFiles.length > 0 ? 'have been provided. Please analyze the images along with the document context to answer the question.' : ''}\n\nPlease answer the question using both the document context and the images provided. If the images contain relevant information, include that in your answer.\n\nANSWER:`;
    } else if (textResults.length > 0) {
      // Only text context available
      prompt = buildRagPrompt(query, textResults.map(r => ({ text: r.chunk.text })), history);
    } else if (finalMediaFiles.length > 0) {
      // Only images available
      prompt = `${hist ? `CONVERSATION HISTORY:\n${hist}\n\n` : ""}USER QUESTION: ${query}\n\nIMAGES PROVIDED: ${finalMediaFiles.length} ${finalMediaFiles.length === 1 ? 'image has' : 'images have'} been provided.\n\nPlease analyze the ${finalMediaFiles.length === 1 ? 'image' : 'images'} carefully and answer the question based on what you see. Describe the content, objects, text, layout, and any relevant details in the ${finalMediaFiles.length === 1 ? 'image' : 'images'}.\n\nANSWER:`;
    } else {
      // No context at all - neither text results nor media files
      console.error(`No context available - hasTextContext: ${hasTextContext}, textResults: ${textResults.length}, mediaFiles: ${finalMediaFiles.length}, stats:`, stats);
      
      if (!hasTextContext && finalMediaFiles.length === 0) {
        return NextResponse.json({ 
          detail: "No documents or images uploaded. Please upload a document or image first. If you just uploaded a file, please wait a moment for processing to complete and try again." 
        }, { status: 400 });
      }
      
      // We have text context but no search results - provide a helpful response
      if (hasTextContext && textResults.length === 0) {
        return NextResponse.json({ 
        session_id, 
        query, 
        response: "I couldn't find information directly matching your question in the uploaded documents. The documents may not contain information about this specific topic, or the question might need to be rephrased. Please try:\n1. Rephrasing your question using different keywords\n2. Asking a more general question about the document content\n3. Uploading additional relevant documents", 
        relevant_chunks: [], 
        chunk_count: 0 
      });
      }
      
      return NextResponse.json({ 
        session_id, 
        query, 
        response: "I couldn't find relevant information in the documents to answer your question. Please try rephrasing your question or upload more relevant documents.", 
        relevant_chunks: [], 
        chunk_count: 0 
      });
    }

    // Generate response with Gemini (including images if available)
    const answer = await generateWithGemini(
      prompt, 
      finalMediaFiles.length > 0 ? finalMediaFiles : undefined
    );
    
    history.push({ role: "assistant", content: answer });
    
    const chunk_info = textResults.map(r => ({ 
      id: r.chunk.id, 
      text: r.chunk.text.length > 200 ? r.chunk.text.slice(0, 200) + "..." : r.chunk.text, 
      score: r.score 
    }));
    
    return NextResponse.json({ 
      session_id, 
      query, 
      response: answer, 
      relevant_chunks: chunk_info, 
      chunk_count: textResults.length,
      media_analyzed: finalMediaFiles.length
    });
  } catch (e: any) {
    console.error("Error in chat route:", e);
    return NextResponse.json({ 
      detail: `Error generating response: ${e.message || e}` 
    }, { status: 500 });
  }
}

