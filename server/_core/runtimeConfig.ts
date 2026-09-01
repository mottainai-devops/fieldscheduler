import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_SECURE"] as const;

function getConfigCandidates(): string[] {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  return [
    process.env.FIELD_SCHEDULER_ENV_PATH,
    resolve(process.cwd(), ".env"),
    resolve(moduleDirectory, "..", ".env"),
    resolve(moduleDirectory, "..", "..", ".env"),
  ].filter((path): path is string => Boolean(path));
}

/**
 * PM2 retains only the environment supplied at process launch. Load the
 * restricted application configuration from a deterministic local path so
 * application and standalone operational runners use the same server config.
 */
export function loadRuntimeConfig(): string | null {
  for (const candidate of Array.from(new Set(getConfigCandidates()))) {
    if (existsSync(candidate)) {
      config({ path: candidate, override: false });
      return candidate;
    }
  }
  return null;
}

export function assertSmtpConfiguration(): void {
  const missing = SMTP_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error("Dead-man TEST alert SMTP configuration is unavailable; server-side SMTP configuration is incomplete.");
  }
}

/** Safe operational evidence: names and booleans only; never configuration values. */
export function getSmtpConfigurationPresence(): Record<(typeof SMTP_KEYS)[number], boolean> {
  return Object.fromEntries(SMTP_KEYS.map((key) => [key, Boolean(process.env[key])])) as Record<
    (typeof SMTP_KEYS)[number],
    boolean
  >;
}

loadRuntimeConfig();
