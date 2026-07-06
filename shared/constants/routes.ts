/**
 * Route lifecycle status constants
 *
 * T40 Rule #66 / Pattern #58: canonical constants for route status references.
 * Import from here instead of hardcoding status strings in server or client code.
 *
 * Status enum (from routes table):
 *   pending | pending_assignment | optimized | assigned | in_progress | completed | cancelled
 *
 * T40 Scope B decision (2026-07-06):
 *   - EDITABLE: pending, pending_assignment, optimized, assigned, cancelled
 *   - LOCKED (read-only): in_progress, completed
 *   - DELETABLE: same set as EDITABLE
 *   - Live route editing (in_progress) deferred to Phase 2
 *   - Completed route reactivation deferred to Phase 3
 */

export const EDITABLE_ROUTE_STATUSES = [
  'pending',
  'pending_assignment',
  'optimized',
  'assigned',
  'cancelled',
] as const;

export type EditableRouteStatus = typeof EDITABLE_ROUTE_STATUSES[number];

/** Deletable statuses are the same set as editable for T40 */
export const DELETABLE_ROUTE_STATUSES = EDITABLE_ROUTE_STATUSES;

export const LOCKED_ROUTE_STATUSES = [
  'in_progress',
  'completed',
] as const;

export type LockedRouteStatus = typeof LOCKED_ROUTE_STATUSES[number];

/** Human-readable error message when a status gate blocks an edit */
export function routeStatusGateMessage(status: string): string {
  return `Cannot modify route in status '${status}'. Only routes in status ${EDITABLE_ROUTE_STATUSES.map(s => `'${s}'`).join(', ')} can be edited.`;
}

/** Human-readable error message when a status gate blocks a delete */
export function routeDeleteGateMessage(status: string): string {
  return `Cannot delete route in status '${status}'. Only routes in status ${DELETABLE_ROUTE_STATUSES.map(s => `'${s}'`).join(', ')} can be deleted.`;
}
