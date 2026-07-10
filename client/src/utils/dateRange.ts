/**
 * defaultDateRange — shared rolling 30-day date range utility.
 *
 * Returns { start, end } as ISO date strings (YYYY-MM-DD) where:
 *   start = today minus 30 days
 *   end   = today
 *
 * Rule #99 (T56b): All dashboard date range defaults must use this
 * utility to ensure consistent 30-day rolling windows across the app.
 * Never use current-month-start (new Date().getMonth()) as a default.
 */
export function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}
