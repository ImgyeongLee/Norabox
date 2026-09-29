import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ErrorCode } from "@/i18n/messages/en";
import { fieldErrors } from "@/lib/validation";

/** `error` and `fields` values are error codes; the client shows them in the viewer's language. */
export type ApiError = { error: string; fields?: Record<string, string> };

export function jsonError(error: ErrorCode, status = 400, fields?: Record<string, ErrorCode>) {
  return NextResponse.json<ApiError>({ error, fields }, { status });
}

export function validationError(err: z.ZodError) {
  const fields = fieldErrors(err);
  return NextResponse.json<ApiError>({ error: Object.values(fields)[0] ?? "invalidInput", fields }, { status: 400 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
