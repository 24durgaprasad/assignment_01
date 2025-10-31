import { NextResponse } from "next/server";
import { sessions } from "../../_state";

export const runtime = "nodejs";

export async function POST() {
  const id = crypto.randomUUID();
  sessions.set(id, []);
  return NextResponse.json({ session_id: id, message: "New session created" });
}

