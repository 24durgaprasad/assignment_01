import { NextResponse } from "next/server";
import { sessions } from "../../../_state";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessions.has(sessionId)) return NextResponse.json({ detail: "Session not found" }, { status: 404 });
  return NextResponse.json({ session_id: sessionId, history: sessions.get(sessionId) || [] });
}

