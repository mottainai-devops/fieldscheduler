export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// Item 1 (T13): Canonical routing reason labels — mirrors routes.routingReason and routeCustomers.routingReason ENUM
export const ROUTING_REASONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'callback', label: 'Callback' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
] as const;

export type RoutingReasonValue = typeof ROUTING_REASONS[number]['value'];
export const ROUTING_REASON_OTHER_MIN_CHARS = 10;

// Item 5/11 (T13): Canonical skip reason labels — mirrors routeCustomers.skipReason ENUM
export const SKIP_REASONS = [
  { value: 'no_access', label: 'No Access' },
  { value: 'customer_not_home', label: 'Customer Not Home' },
  { value: 'refused', label: 'Refused' },
  { value: 'unsafe_location', label: 'Unsafe Location' },
  { value: 'vehicle_issue', label: 'Vehicle Issue' },
  { value: 'time_constraint', label: 'Time Constraint' },
  { value: 'other', label: 'Other' },
] as const;

export type SkipReasonValue = typeof SKIP_REASONS[number]['value'];
