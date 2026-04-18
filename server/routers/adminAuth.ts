import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as fieldWorkerDb from "../fieldWorkerDb";
import * as db from "../db";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "@shared/const";

export const adminAuthRouter = router({
  // Login with email and password
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[AdminAuth] Login attempt:', input.email);
        // For now, accept any email/password combination
        // In production, you would hash and verify passwords
        const worker = await fieldWorkerDb.getWorkerByEmail(input.email);
        console.log('[AdminAuth] Worker found:', worker?.email || 'NOT FOUND');
        
        if (!worker) {
          throw new Error("Worker not found");
        }
        
        // Simple password check - in production use bcrypt
        // For now, accept any non-empty password
        if (!input.password) {
          throw new Error("Password required");
        }
        
        // Create a user record in the users table if it doesn't exist
        // Use the worker's email as the openId for session purposes
        const openId = `worker-${worker.id}-${worker.email}`;
        await db.upsertUser({
          openId,
          name: worker.name || null,
          email: worker.email || null,
          loginMethod: 'email',
        });
        
        console.log('[AdminAuth] User record created/updated for:', openId);
        
        // Create a session token using the openId
        const sessionToken = await sdk.createSessionToken(openId, {
          name: worker.name || 'Worker',
        });
        
        // Set the session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        
        console.log('[AdminAuth] Session cookie set for:', openId);
        
        return {
          success: true,
          worker: {
            id: worker.id,
            name: worker.name,
            email: worker.email,
          },
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Login failed");
      }
    }),

  // Get worker by ID
  getWorker: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerById(input.id);
    }),

  // Get all workers (for selection screen)
  getAllWorkers: publicProcedure.query(async () => {
    return await fieldWorkerDb.getAllWorkers();
  }),
});

