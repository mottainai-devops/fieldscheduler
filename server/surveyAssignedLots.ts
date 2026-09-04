export type CachedAssignedLot = {
  lotCode: string;
  lotName: string;
  companyName: string | null;
  paytWebhook: string | null;
  monthlyWebhook: string | null;
  lotId: number | null;
  lotNumber: number | null;
};

type SurveyLot = {
  lotCode?: string | null;
  lotName?: string | null;
  companyName?: string | null;
  paytWebhook?: string | null;
  monthlyWebhook?: string | null;
  lotId?: number | null;
  lotNumber?: number | null;
};

type SurveyUserLots = {
  companyId?: string | null;
  assignedLots?: SurveyLot[] | null;
};

type AdminLot = {
  lotCode?: string | null;
  paytWebhook?: string | null;
  monthlyWebhook?: string | null;
  id?: number | null;
  lotNumber?: number | null;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

function numberFromLotCode(lotCode: string): number | null {
  const match = lotCode.match(/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function readAdminLots(payload: unknown): AdminLot[] {
  const value = payload as { 0?: { result?: { data?: { json?: { lots?: AdminLot[] } } } } };
  return value?.[0]?.result?.data?.json?.lots ?? [];
}

/**
 * Builds the cache consumed by supervisor login and Refresh Lots.
 * A Franchisee-scoped cherry-picker response carries webhook values itself.
 * Regular company-bound responses keep the established one-call enrichment.
 */
export async function buildSurveyAssignedLots(
  surveyUser: SurveyUserLots,
  options: { adminApi?: string; fetchImpl?: FetchLike } = {},
): Promise<CachedAssignedLot[]> {
  const rawLots = Array.isArray(surveyUser.assignedLots) ? surveyUser.assignedLots : [];
  const adminLotMap = new Map<string, AdminLot>();
  const surveyCompanyId = String(surveyUser.companyId || "");

  if (surveyCompanyId) {
    const adminApi = options.adminApi || process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    try {
      const input = encodeURIComponent(JSON.stringify({
        "0": { json: { companyId: surveyCompanyId, page: 1, limit: 200 } },
      }));
      const response = await fetchImpl(
        `${adminApi}/api/trpc/lots.list?batch=1&input=${input}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (response.ok) {
        for (const lot of readAdminLots(await response.json())) {
          if (lot.lotCode) adminLotMap.set(lot.lotCode, lot);
        }
      }
    } catch {
      // Keep the cache usable with upstream data if enrichment is unavailable.
    }
  }

  return rawLots
    .filter((lot): lot is SurveyLot & { lotCode: string } => Boolean(lot?.lotCode))
    .map(lot => {
      const match = adminLotMap.get(lot.lotCode);
      return {
        lotCode: lot.lotCode,
        lotName: lot.lotName || lot.lotCode,
        companyName: lot.companyName || null,
        paytWebhook: lot.paytWebhook ?? match?.paytWebhook ?? null,
        monthlyWebhook: lot.monthlyWebhook ?? match?.monthlyWebhook ?? null,
        lotId: lot.lotId ?? match?.id ?? null,
        lotNumber: lot.lotNumber ?? match?.lotNumber ?? numberFromLotCode(lot.lotCode),
      };
    });
}
