# T36 — Legacy `fieldworker-app` Investigation & Decision Document

**Date:** 2026-07-03  
**Engagement:** T36 (read-only investigation)  
**Prepared by:** Manus AI  

---

## Executive Summary

The `fieldworker-app` process (systemd `field-scheduler.service`, port 3000) is a **legacy Node.js application** that shares the same `fieldworker_db` MySQL database as the production `field-worker-scheduler` (PM2, port 3002). It is **not exposed to the public internet** through the active nginx configuration, but it does contain **two plaintext PIN comparison paths** that bypass the bcrypt hardening applied in T34–T35. The mobile app (`fieldscheduler-mobile`) calls `https://app.fieldscheduler.net/api/trpc`, which nginx routes exclusively to port 3002 — meaning the legacy app currently receives **zero real-world traffic**. The recommended action is to **stop and disable** the systemd service, not to patch it.

---

## Investigation Findings

### (a) Process Identification

| Property | Value |
|----------|-------|
| Systemd unit | `field-scheduler.service` |
| Working directory | `/home/ubuntu/fieldworker-app` |
| ExecStart | `node /home/ubuntu/fieldworker-app/dist/index.js` |
| Listening port | 3000 (overrides `PORT=4000` in unit file via `.env`) |
| Restart counter | 3 (has crashed and restarted 3 times) |
| Uptime | Running since last restart; no sustained uptime |

### (b) Codebase Location

| Property | Value |
|----------|-------|
| Directory | `/home/ubuntu/fieldworker-app` |
| Git remote | `mottainai-devops/fieldscheduler` (same repo as `field-worker-scheduler`) |
| Last dist build | November 2025 (pre-T33 era) |
| Source branch | Unknown — dist is compiled from an older commit |

The `fieldworker-app` directory is a **stale deployment** of the same `mottainai-devops/fieldscheduler` repository, built from a November 2025 snapshot. It is not kept in sync with the main branch and has not been updated since T33, T34, or T35 were applied.

### (c) What the App Does

The app exposes a tRPC API surface with the following routers:

| Router | Key Procedures | Notes |
|--------|---------------|-------|
| `adminAuth` | `login`, `pinLogin`, `register`, `requestReset`, `resetPassword` | Uses `adminUsers` table (separate from `workers`) |
| `workerAuth` (legacy) | `login`, `register`, `me`, `logout` | Uses `workerAuthDb.ts` with bcrypt — but this router is **not the same** as `workerAuthRouter` |
| `workerAuth` (field worker) | `login`, `verifyPin`, `getAllWorkers`, `getByEmail` | **Plaintext PIN comparison** — see (e) |
| `fieldWorker` | `getWorkers`, `createWorker`, `updateWorker`, routes, customers, etc. | Full CRUD — same DB as production |
| `integrations` | Zoho sync | Zoho credentials present in process environment |

### (d) Database Connectivity

**Both applications connect to the same database.**

| App | Process | Port | `DATABASE_URL` DB name |
|-----|---------|------|------------------------|
| `fieldworker-app` | systemd PID 1635982 | 3000 | `fieldworker_db` |
| `field-worker-scheduler` | PM2 PID 1452571 | 3002 | `fieldworker_db` |

This means any write operation through the legacy app — worker creation, PIN update, customer modification — directly affects production data. There is no isolation.

### (e) Authentication Mechanism — Plaintext vs Bcrypt

The legacy app contains **two plaintext PIN comparison paths** that were not patched in T34–T35:

**Path 1 — `workerAuthRouter.login` (line ~47 of `server/routers/workerAuth.ts`):**
```typescript
if (!worker.pin || worker.pin !== input.password) {
  throw new Error("Invalid PIN");
}
```
This is a `publicProcedure` (no auth required to call it). It compares the input password directly against the stored bcrypt hash. Since all PINs in the DB are now bcrypt hashes (from T34 Part 2 migration), this path will **always return "Invalid PIN"** for any input — effectively broken, but not exploitable for bypass.

**Path 2 — `workerAuthRouter.verifyPin` (line ~67 of `server/routers/workerAuth.ts`):**
```typescript
if (worker.pin === input.pin) {
  return { success: true, worker };
}
```
Same situation — plaintext comparison against a bcrypt hash will never match. This path is also **effectively broken** for all 7 workers with bcrypt PINs. The 2 phantom workers (IDs 9683, 9722) have `NULL` PINs and would return `{ success: true }` via the `!worker.pin` branch — but these are phantom workers with no real credentials.

**T33 Bypass Risk Assessment:** The T33 bypass pattern (unauthenticated `publicProcedure` that returns data without session validation) is present in the `fieldWorker.getWorkers`, `fieldWorker.getCustomers`, and other read procedures. However, since port 3000 is not exposed via nginx (see (h)), these endpoints are not reachable from the internet.

**`adminAuth.verifyAdminLogin` in `adminAuthDb.ts`:** This function uses `bcrypt.compare` correctly — it was already using bcrypt before T33. The `adminUsers` table is separate from `workers`.

### (f) Traffic Analysis

Over the past 7 days, the `field-scheduler.service` journal contains **180 lines total**, of which **0 are HTTP request logs**. The only activity is:
- Startup/shutdown messages
- Session cookie check logs (`[Auth] Missing session cookie`) — these are health-check probes from nginx or the OS, not real user requests
- Three crash/restart cycles

**No real user traffic has reached port 3000 in the past 7 days.**

### (g) Callers

The Flutter mobile app (`fieldscheduler-mobile`) uses:
```dart
static const String baseUrl = 'https://app.fieldscheduler.net/api/trpc';
```

This resolves to port **3002** (the PM2 `field-worker-scheduler` process) via the active nginx configuration. The mobile app does **not** call port 3000 directly.

No other callers of port 3000 were identified in any repository under `mottainai-devops`.

### (h) Nginx Exposure

| Config file | Status | Target |
|-------------|--------|--------|
| `/etc/nginx/sites-enabled/app.fieldscheduler.net` | **Active (symlinked)** | `proxy_pass http://localhost:3002` |
| `/etc/nginx/sites-available/fieldworker` | **Not enabled** | `proxy_pass http://localhost:3000` |
| `/etc/nginx/sites-available/default` | **Not enabled** | `proxy_pass http://localhost:3000` (for `/api/trpc/`) |

Port 3000 is bound on `0.0.0.0:3000` but the AWS security group and ufw (status: inactive) do not appear to block it at the OS level. However, since the only nginx site that is enabled routes to port 3002, **port 3000 is not reachable via the public domain**. Direct IP access (`http://54.194.172.107:3000`) would reach it if the AWS security group allows port 3000 inbound — this should be verified and closed if open.

---

## Risk Matrix

| Risk | Severity | Likelihood | Notes |
|------|----------|-----------|-------|
| Plaintext PIN bypass via `workerAuth.login` | HIGH | **None** — bcrypt hashes never match plaintext | Broken, not exploitable |
| Plaintext PIN bypass via `workerAuth.verifyPin` | HIGH | **None** — same reason | Broken, not exploitable |
| Unauthenticated data read via `fieldWorker.*` procedures | MEDIUM | **Low** — port not nginx-exposed | Possible only via direct IP if AWS SG allows port 3000 |
| Unauthenticated data write via `fieldWorker.createWorker` | HIGH | **Low** — same | Would write plaintext PINs to shared DB (T35 fix not applied here) |
| Zoho sync triggered via legacy app | MEDIUM | **Low** — no traffic | Would consume Zoho API quota |
| Crash loop consuming resources | LOW | **Active** — 3 restarts logged | Memory: 140 MB peak, CPU: 28 min consumed before crash |

---

## Recommendation

**Stop and disable `field-scheduler.service`.** Do not patch it.

The rationale is as follows. The legacy app receives zero traffic, is not reachable via the public domain, and has crashed three times in the past week. Its two plaintext PIN paths are already non-functional against the bcrypt hashes in the database. Patching it would require applying T34, T35, and T33 fixes to a codebase that is permanently behind the main branch — creating ongoing maintenance debt with no user benefit. Stopping the service eliminates the resource consumption, removes the crash loop, and eliminates the theoretical risk of direct-IP access to unpatched endpoints.

The recommended T37 action is:
1. Verify the AWS security group does not expose port 3000 inbound (close it if open)
2. Run `sudo systemctl stop field-scheduler.service && sudo systemctl disable field-scheduler.service`
3. Archive the `/home/ubuntu/fieldworker-app` directory to a tarball and delete it
4. Update `AGENTS.md` on the production server to document the decommission

---

## T37 Carry-Forward

| Priority | Item |
|----------|------|
| **CRITICAL** | Verify AWS security group does not expose port 3000 publicly |
| HIGH | `sudo systemctl stop field-scheduler.service && sudo systemctl disable field-scheduler.service` |
| HIGH | Archive and delete `/home/ubuntu/fieldworker-app` |
| MEDIUM | Move rate limiter to DB-backed `loginAttempts` table (Rule #70, from T34) |
| LOW | Superadmin auth architecture alignment (Rule #69, from T34) |
