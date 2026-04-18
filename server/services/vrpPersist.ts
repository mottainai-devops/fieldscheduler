import type { Kysely } from 'kysely';
type Ctx = { db: Kysely<any> };

export async function persistAssignments(ctx: Ctx, opts: {
  workerAssignments: Record<string, number[]>;
  plannedAt?: Date;
}) {
  const plannedAt = opts.plannedAt ?? new Date();
  const routeIds: Record<string, number> = {};

  for (const [workerName, customerIds] of Object.entries(opts.workerAssignments)) {
    if (!customerIds?.length) continue;

    // Create route row
    const routeRes = await ctx.db
      .insertInto('routes')
      .values({
        workerName,
        planned_at: plannedAt as any,  // column may be planned_at or plannedAt
        status: 'planned',
      } as any)
      .executeTakeFirst();

    // Fallback: fetch last inserted id if needed
    const routeId =
      (routeRes as any)?.insertId ??
      (await ctx.db.selectFrom('routes')
        .select(['id'])
        .where('workerName', '=', workerName as any)
        .orderBy('id', 'desc')
        .limit(1)
        .executeTakeFirst())?.id;

    if (!routeId) continue;
    routeIds[workerName] = Number(routeId);

    // Insert sequence into routeCustomers
    let seq = 1;
    for (const cid of customerIds) {
      await ctx.db
        .insertInto('routeCustomers')
        .values({
          route_id: routeId as any,
          customer_id: cid as any,
          sequence: seq++,
          status: 'assigned',
        } as any)
        .execute();
    }
  }
  return routeIds;
}

// Parse ArcGIS VRP-ish structures safely → { workerName: [customerIds...] }
export function extractAssignmentsFromVRP(vrp: any) {
  const out: Record<string, number[]> = {};
  if (!vrp) return out;

  // Try common shapes
  const routes = vrp.routes || vrp.output?.routes || vrp.results?.routes || [];
  for (const r of routes) {
    const w = String(r?.name || r?.routeName || r?.RouteName || 'worker');
    const stops = r?.stops || r?.assignedStops || r?.Stops || [];
    const ids: number[] = [];
    for (const s of stops) {
      const n = String(s?.name || s?.Name || '');
      const m = n.match(/^C-(\d+)$/);
      if (m) ids.push(Number(m[1]));
    }
    if (ids.length) out[w] = ids;
  }

  // Fallback: flat orderedStops at top-level
  if (!Object.keys(out).length) {
    const stops = vrp.stops || vrp.assignedStops || [];
    const ids = stops
      .map((s: any) => String(s?.name || s?.Name || ''))
      .map((n: string) => (n.match(/^C-(\d+)$/)?.[1]))
      .filter(Boolean)
      .map(Number);
    if (ids.length) out['worker-1'] = ids;
  }

  return out;
}

