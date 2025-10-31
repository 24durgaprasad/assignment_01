import { NextResponse } from "next/server";
import { sessions, store } from "../_state";

export const runtime = "nodejs";

export async function DELETE() {
  store.clear();
  sessions.clear();
  return NextResponse.json({ message: "All data cleared" });
}

