import { NextResponse } from "next/server";
import { sessions, store } from "../_state";
import { buildRagPrompt, generateWithGemini } from "@/lib/gemini";

type ChatRequest = { session_id: string; query: string; top_k?: number };

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ChatRequest;
  const { session_id, query, top_k = 5 } = body;
  if (!query || !query.trim()) return NextResponse.json({ detail: "Query cannot be empty" }, { status: 400 });

  if (!sessions.has(session_id)) {
    sessions.set(session_id, []);
  }

  if (store.getStats().index_size === 0) {
    return NextResponse.json({ detail: "No documents uploaded. Please upload a document first." }, { status: 400 });
  }

  const history = sessions.get(session_id)!;
  history.push({ role: "user", content: query });

  try {
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

