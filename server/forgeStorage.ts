/**
 * Legacy platform storage helper retained only for non-evidence internal assets.
 * Compliance photos and payment evidence use server/storage.ts, which is the
 * owner-managed private AWS S3 adapter with strict evidence-prefix validation.
 */

import { ENV } from "./_core/env";

type ForgeStorageConfig = { baseUrl: string; apiKey: string };

function getForgeStorageConfig(): ForgeStorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("Platform storage is not configured");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function forgeStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getForgeStorageConfig();
  const key = normalizeKey(relKey);
  const url = new URL("v1/storage/upload", `${baseUrl}/`);
  url.searchParams.set("path", key);
  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() || "file");

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error("Platform storage upload is unavailable");
  }
  const responseBody = await response.json() as { url?: unknown };
  if (typeof responseBody.url !== "string" || !responseBody.url) {
    throw new Error("Platform storage upload returned an invalid response");
  }
  return { key, url: responseBody.url };
}
