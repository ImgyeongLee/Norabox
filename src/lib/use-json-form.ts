"use client";

import { useState } from "react";

/** Small helper for forms that POST JSON to an API route and show field errors. */
export function useJsonForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit<T = unknown>(url: string, body: unknown, method = "POST"): Promise<T | null> {
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Values are error codes; components translate them with useI18n().tError.
        setErrors({ ...(data.fields ?? {}), form: data.error ?? "generic" });
        return null;
      }
      return data as T;
    } catch {
      setErrors({ form: "network" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { errors, setErrors, busy, submit };
}
