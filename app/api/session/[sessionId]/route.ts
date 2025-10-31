import { NextResponse } from "next/server";
import { sessions } from "../../_state";

export async function DELETE(_: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    return NextResponse.json({ message: "Session deleted" });
  }
  return NextResponse.json({ detail: "Session not found" }, { status: 404 });
}

