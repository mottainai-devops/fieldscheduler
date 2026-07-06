-- T40: Extend calendarAuditLog enums to support route editing audit trail
-- Adds 'route' and 'route_customer' to entityType
-- Adds 'deleted' to action

ALTER TABLE calendarAuditLog
  MODIFY COLUMN entityType ENUM(
    'schedule',
    'instance',
    'schedule_customer',
    'instance_override',
    'route',
    'route_customer'
  ) NOT NULL;

ALTER TABLE calendarAuditLog
  MODIFY COLUMN action ENUM(
    'created',
    'updated',
    'cancelled',
    'rescheduled',
    'customer_skipped',
    'customer_removed',
    'customer_added',
    'handoff_requested',
    'handoff_accepted',
    'auto_paused',
    'deleted'
  ) NOT NULL;
