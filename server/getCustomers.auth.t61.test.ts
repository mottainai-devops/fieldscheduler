import { describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { resolveWorkerOrUserContext } from './_core/trpc';

function makeContext(options: { user?: object | null; authorization?: string }) {
  return {
    user: options.user ?? null,
    req: { headers: { authorization: options.authorization } },
    res: {},
  } as any;
}

describe('T61 getCustomers access gate', () => {
  it('denies an unauthenticated request before any customer query can run', async () => {
    await expect(
      resolveWorkerOrUserContext(makeContext({})),
    ).rejects.toMatchObject<Partial<TRPCError>>({ code: 'UNAUTHORIZED' });
  });

  it('accepts the Flutter Survey bearer-token path', async () => {
    const resolveWorker = vi.fn().mockResolvedValue({ workerId: 61, surveyAppUserId: 'survey-61' });
    const context = await resolveWorkerOrUserContext(
      makeContext({ authorization: 'Bearer test-supervisor-token' }),
      resolveWorker,
    );

    expect(resolveWorker).toHaveBeenCalledWith('test-supervisor-token');
    expect(context.workerId).toBe(61);
    expect(context.workerSurveyAppUserId).toBe('survey-61');
  });

  it('accepts the authenticated React web-session path without requiring a bearer token', async () => {
    const resolveWorker = vi.fn();
    const webUser = { id: 9, role: 'field_manager' };
    const context = await resolveWorkerOrUserContext(
      makeContext({ user: webUser }),
      resolveWorker,
    );

    expect(context.user).toBe(webUser);
    expect(resolveWorker).not.toHaveBeenCalled();
  });
});

