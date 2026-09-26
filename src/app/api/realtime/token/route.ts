import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { signSocketToken } from "@/lib/session";

/** Short-lived token that identifies the signed-in user to the realtime server. */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { token: user ? await signSocketToken(user.id) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
