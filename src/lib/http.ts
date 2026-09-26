import { NextResponse } from "next/server";
import type { z } from "zod";
import { fieldErrors } from "@/lib/validation";

export type ApiError = { error: string; fields?: Record<string, string> };

export function jsonError(error: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json<ApiError>({ error, fields }, { status });
}

export function validationError(err: z.ZodError) {
  const fields = fieldErrors(err);
  return jsonError(Object.values(fields)[0] ?? "Invalid input", 400, fields);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
