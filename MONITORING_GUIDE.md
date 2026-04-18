# Production Monitoring & Observability Guide

**Field Worker Scheduler - Live Demo**  
**Version:** 1.0.0  
**Last Updated:** November 8, 2025

## Overview

This guide covers monitoring, logging, and observability for the Field Worker Scheduler application in production. It includes setup instructions for error tracking, performance monitoring, and custom metrics.

## Monitoring Stack

### Core Components
1. **Error Tracking:** Sentry
2. **Performance Monitoring:** DataDog or New Relic
3. **Log Aggregation:** ELK Stack or CloudWatch
4. **Custom Metrics:** Prometheus + Grafana
5. **Uptime Monitoring:** UptimeRobot or Pingdom

## Error Tracking with Sentry

### Setup

```bash
# Install Sentry SDK
pnpm add @sentry/react @sentry/trpc
```

### Configuration

```typescript
// client/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// server/routers.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

### Error Reporting

```typescript
// Automatic error reporting
try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
}

// Custom error context
Sentry.withScope((scope) => {
  scope.setContext("worker", {
    id: workerId,
    name: workerName,
  });
  Sentry.captureException(error);
});
```

## Performance Monitoring

### Key Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time (p95) | < 200ms | > 500ms | > 1000ms |
| Database Query Time | < 100ms | > 300ms | > 1000ms |
| Cache Hit Rate | > 80% | < 60% | < 40% |
| Sync Success Rate | > 99% | < 95% | < 90% |
| Offline Queue Size | < 100 | > 500 | > 1000 |

### DataDog Setup

```typescript
// server/_core/monitoring.ts
import { StatsD } from 'node-statsd';

const statsd = new StatsD({
  host: process.env.DATADOG_AGENT_HOST || 'localhost',
  port: process.env.DATADOG_AGENT_PORT || 8125,
  prefix: 'field_worker_scheduler.',
});

// Track API response time
export function trackApiTime(endpoint: string, duration: number) {
  statsd.timing(`api.${endpoint}`, duration);
}

// Track database query time
export function trackDbTime(query: string, duration: number) {
  statsd.timing(`db.${query}`, duration);
}

// Track cache operations
export function trackCacheHit(key: string) {
  statsd.increment('cache.hit', { key });
}

export function trackCacheMiss(key: string) {
  statsd.increment('cache.miss', { key });
}

// Track sync operations
export function trackSyncOperation(type: string, success: boolean) {
  statsd.increment(`sync.${type}`, { success: success ? 'true' : 'false' });
}
```

## Logging Strategy

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Critical failures | Database connection failed |
| WARN | Potential issues | Slow query detected |
| INFO | Important events | User logged in, sync completed |
| DEBUG | Development info | Cache hit, API call made |
| TRACE | Detailed debugging | Variable values, function calls |

### Structured Logging

```typescript
// server/_core/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: 'field-worker-scheduler' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Usage
logger.info('User logged in', {
  userId: user.id,
  timestamp: new Date(),
});

logger.error('Sync failed', {
  error: error.message,
  taskId: task.id,
  retries: task.retries,
});
```

### Log Aggregation with ELK Stack

```yaml
# docker-compose.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.0.0
    volumes:
      - ./logs:/var/log/app
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    command: filebeat -c /usr/share/filebeat/filebeat.yml -e
```

## Custom Metrics

### Offline Functionality Metrics

```typescript
// client/src/lib/metrics.ts
export interface OfflineMetrics {
  offlineUsers: number;
  pendingSyncTasks: number;
  syncSuccessRate: number;
  cacheHitRate: number;
  averageSyncTime: number;
}

export function trackOfflineMetrics() {
  const queue = getQueue();
  const metadata = getSyncMetadata();

  const metrics: OfflineMetrics = {
    offlineUsers: getOfflineUserCount(),
    pendingSyncTasks: queue.length,
    syncSuccessRate: calculateSyncSuccessRate(),
    cacheHitRate: calculateCacheHitRate(),
    averageSyncTime: calculateAverageSyncTime(),
  };

  // Send to monitoring service
  sendMetrics(metrics);
}

function calculateSyncSuccessRate(): number {
  const metadata = getSyncMetadata();
  const total = metadata.totalTasks;
  if (total === 0) return 100;
  
  const synced = metadata.totalTasks - metadata.failedTasks;
  return (synced / total) * 100;
}
```

### Database Metrics

```typescript
// server/_core/dbMetrics.ts
export async function trackDatabaseMetrics() {
  const db = await getDb();
  
  const metrics = {
    totalCustomers: await db.select().from(customers),
    totalRoutes: await db.select().from(routes),
    totalWorkers: await db.select().from(workers),
    activeRoutes: await db.select().from(routes).where(eq(routes.status, 'in_progress')),
    pendingSyncTasks: await db.select().from(syncQueue),
  };

  return metrics;
}
```

## Alerting Rules

### Critical Alerts

```yaml
# prometheus-rules.yml
groups:
  - name: field_worker_scheduler
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: SlowApiResponse
        expr: histogram_quantile(0.95, api_response_time) > 1000
        for: 5m
        annotations:
          summary: "API response time is slow"

      - alert: LargeOfflineQueue
        expr: offline_queue_size > 1000
        for: 10m
        annotations:
          summary: "Offline sync queue is growing"

      - alert: LowSyncSuccessRate
        expr: sync_success_rate < 0.9
        for: 15m
        annotations:
          summary: "Sync success rate is below 90%"

      - alert: DatabaseDown
        expr: up{job="database"} == 0
        for: 1m
        annotations:
          summary: "Database is down"
```

## Dashboards

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Field Worker Scheduler - Production",
    "panels": [
      {
        "title": "API Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, api_response_time)"
          }
        ]
      },
      {
        "title": "Offline Users",
        "targets": [
          {
            "expr": "offline_users_count"
          }
        ]
      },
      {
        "title": "Pending Sync Tasks",
        "targets": [
          {
            "expr": "offline_queue_size"
          }
        ]
      },
      {
        "title": "Sync Success Rate",
        "targets": [
          {
            "expr": "sync_success_rate * 100"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "cache_hit_rate * 100"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

## Health Checks

### Application Health Endpoint

```typescript
// server/routers.ts
export const appRouter = router({
  health: publicProcedure.query(async () => {
    const db = await getDb();
    
    try {
      // Check database
      await db.select().from(users).limit(1);
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        checks: {
          database: 'ok',
          cache: 'ok',
          serviceWorker: 'ok',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
        checks: {
          database: 'error',
          cache: 'ok',
          serviceWorker: 'ok',
        },
      };
    }
  }),
});
```

### Uptime Monitoring

```bash
# Configure UptimeRobot
# Monitor: https://your-domain.com/api/health
# Interval: 5 minutes
# Alert: Email on downtime
```

## Log Analysis Queries

### Common Elasticsearch Queries

```json
// Find all sync failures
{
  "query": {
    "bool": {
      "must": [
        { "match": { "message": "sync failed" } },
        { "range": { "timestamp": { "gte": "now-24h" } } }
      ]
    }
  }
}

// Find slow API calls
{
  "query": {
    "range": {
      "api_response_time": { "gte": 1000 }
    }
  },
  "aggs": {
    "by_endpoint": {
      "terms": { "field": "endpoint" }
    }
  }
}

// Find errors by worker
{
  "query": {
    "match": { "level": "error" }
  },
  "aggs": {
    "by_worker": {
      "terms": { "field": "worker_id" }
    }
  }
}
```

## Incident Response

### Incident Severity Levels

| Level | Response Time | Escalation |
|-------|---------------|-----------|
| P1 (Critical) | 15 minutes | Immediate |
| P2 (High) | 1 hour | Within 30 min |
| P3 (Medium) | 4 hours | Within 2 hours |
| P4 (Low) | 24 hours | Next business day |

### Incident Response Checklist

1. **Detect:** Alert triggered
2. **Acknowledge:** Team member acknowledges
3. **Investigate:** Check logs, metrics, health
4. **Communicate:** Update status page
5. **Mitigate:** Apply temporary fix if needed
6. **Resolve:** Implement permanent fix
7. **Document:** Post-mortem analysis
8. **Prevent:** Update monitoring/alerting

## Capacity Planning

### Growth Projections

| Metric | Current | 3 Months | 6 Months | 12 Months |
|--------|---------|----------|----------|-----------|
| Daily Active Users | 100 | 500 | 1000 | 5000 |
| Customers | 1122 | 5000 | 10000 | 50000 |
| Daily Sync Operations | 500 | 2500 | 5000 | 25000 |
| Database Size | 100MB | 500MB | 1GB | 5GB |

### Resource Scaling

```bash
# Monitor resource usage
watch -n 1 'free -h && df -h && ps aux | head -n 10'

# Scale up if:
# - CPU usage > 80% for 15 minutes
# - Memory usage > 85%
# - Disk usage > 80%
# - Database connections at max
```

## Maintenance Windows

### Scheduled Maintenance

```
Every Sunday 2:00 AM - 3:00 AM UTC
- Database maintenance
- Log rotation
- Cache cleanup
- Backup verification
```

### Maintenance Notification

```typescript
// Notify users of maintenance
export async function notifyMaintenanceWindow() {
  const users = await db.select().from(users);
  
  users.forEach((user) => {
    sendEmail(user.email, {
      subject: 'Scheduled Maintenance',
      body: 'The Field Worker Scheduler will be down for maintenance on Sunday 2:00 AM UTC',
    });
  });
}
```

---

**Last Updated:** November 8, 2025  
**Next Review:** November 15, 2025

