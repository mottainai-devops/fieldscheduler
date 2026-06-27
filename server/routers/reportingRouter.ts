import { router, fieldManagerProcedure, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

export const reportingRouter = router({
  /**
   * Get all report templates
   */
  // T14 Item 3: fieldManagerProcedure — report template reads accessible to all admin-tier roles
  getTemplates: fieldManagerProcedure
    .input(z.object({
      reportType: z.enum(['customer', 'route', 'worker', 'financial', 'compliance', 'custom']).optional(),
      category: z.enum(['operational', 'financial', 'compliance', 'performance', 'executive']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        let query = 'SELECT * FROM reportTemplates WHERE 1=1';
        const params: any[] = [];

        if (input.reportType) {
          query += ' AND reportType = ?';
          params.push(input.reportType);
        }

        if (input.category) {
          query += ' AND category = ?';
          params.push(input.category);
        }

        query += ' ORDER BY isSystem DESC, name ASC';

        const result = await db.execute(sql.raw(query, params));
        return result[0] as any[];
      } catch (error) {
        console.error('[Reporting Router] Error in getTemplates:', error);
        return [];
      }
    }),

  /**
   * Get a single report template by ID
   */
  // T14 Item 3: fieldManagerProcedure — report template reads accessible to all admin-tier roles
  getTemplateById: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const result = await db.execute(sql`
          SELECT * FROM reportTemplates WHERE id = ${input.id}
        `);
        return result[0]?.[0] || null;
      } catch (error) {
        console.error('[Reporting Router] Error in getTemplateById:', error);
        return null;
      }
    }),

  /**
   * Create a new report template
   */
  // T14 Item 3: adminProcedure — report template creation is admin-tier
  createTemplate: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      reportType: z.enum(['customer', 'route', 'worker', 'financial', 'compliance', 'custom']),
      category: z.enum(['operational', 'financial', 'compliance', 'performance', 'executive']),
      config: z.any(), // JSON configuration
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const result = await db.execute(sql`
          INSERT INTO reportTemplates (name, description, reportType, category, config, createdBy)
          VALUES (${input.name}, ${input.description || ''}, ${input.reportType}, 
                  ${input.category}, ${JSON.stringify(input.config)}, ${ctx.user.id})
        `);
        return { success: true, id: result[0].insertId };
      } catch (error) {
        console.error('[Reporting Router] Error in createTemplate:', error);
        throw new Error('Failed to create report template');
      }
    }),

  /**
   * Generate a report from a template
   */
  // T14 Item 3: fieldManagerProcedure — report generation accessible to all admin-tier roles
  generateReport: fieldManagerProcedure
    .input(z.object({
      templateId: z.number(),
      filters: z.any().optional(),
      format: z.enum(['json', 'csv', 'excel', 'pdf']).default('json'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Get template
        const templateResult = await db.execute(sql`
          SELECT * FROM reportTemplates WHERE id = ${input.templateId}
        `);
        const template = templateResult[0]?.[0] as any;
        
        if (!template) {
          throw new Error('Template not found');
        }

        // Log execution start
        const execResult = await db.execute(sql`
          INSERT INTO reportExecutions (templateId, executedBy, executionType, status, startTime)
          VALUES (${input.templateId}, ${ctx.user.id}, 'manual', 'processing', NOW())
        `);
        const executionId = execResult[0].insertId;

        // Parse template config
        const config = typeof template.config === 'string' 
          ? JSON.parse(template.config) 
          : template.config;

        // Generate report data based on template type
        let reportData: any = {};
        
        switch (template.reportType) {
          case 'customer':
            reportData = await generateCustomerReport(db, config, input.filters);
            break;
          case 'route':
            reportData = await generateRouteReport(db, config, input.filters);
            break;
          case 'worker':
            reportData = await generateWorkerReport(db, config, input.filters);
            break;
          case 'financial':
            reportData = await generateFinancialReport(db, config, input.filters);
            break;
          case 'compliance':
            reportData = await generateComplianceReport(db, config, input.filters);
            break;
          default:
            reportData = await generateCustomReport(db, config, input.filters);
        }

        // Update execution status
        await db.execute(sql`
          UPDATE reportExecutions 
          SET status = 'completed', endTime = NOW(), 
              duration = TIMESTAMPDIFF(MILLISECOND, startTime, NOW()),
              recordCount = ${reportData.recordCount || 0}
          WHERE id = ${executionId}
        `);

        return {
          success: true,
          executionId,
          template: {
            id: template.id,
            name: template.name,
            type: template.reportType,
          },
          data: reportData,
          generatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[Reporting Router] Error in generateReport:', error);
        throw new Error('Failed to generate report');
      }
    }),

  /**
   * Get all KPI definitions
   */
  // T14 Item 3: fieldManagerProcedure — KPI reads accessible to all admin-tier roles
  getKPIs: fieldManagerProcedure
    .input(z.object({
      category: z.enum(['operational', 'financial', 'compliance', 'performance', 'customer']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        let query = 'SELECT * FROM kpiDefinitions WHERE isActive = 1';
        const params: any[] = [];

        if (input.category) {
          query += ' AND category = ?';
          params.push(input.category);
        }

        query += ' ORDER BY displayOrder ASC, name ASC';

        const result = await db.execute(sql.raw(query, params));
        return result[0] as any[];
      } catch (error) {
        console.error('[Reporting Router] Error in getKPIs:', error);
        return [];
      }
    }),

  /**
   * Calculate KPI values
   */
  // T14 Item 3: adminProcedure — KPI calculation is admin-tier
  calculateKPI: adminProcedure
    .input(z.object({
      kpiId: z.number(),
      periodType: z.enum(['current', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
      periodStart: z.string(),
      periodEnd: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Get KPI definition
        const kpiResult = await db.execute(sql`
          SELECT * FROM kpiDefinitions WHERE id = ${input.kpiId}
        `);
        const kpi = kpiResult[0]?.[0] as any;
        
        if (!kpi) {
          throw new Error('KPI not found');
        }

        // Calculate KPI value based on formula
        const calculation = typeof kpi.calculation === 'string'
          ? JSON.parse(kpi.calculation)
          : kpi.calculation;

        let value = 0;
        
        // Execute calculation based on KPI type
        // This is a simplified version - real implementation would be more complex
        switch (kpi.category) {
          case 'operational':
            value = await calculateOperationalKPI(db, calculation, input.periodStart, input.periodEnd);
            break;
          case 'financial':
            value = await calculateFinancialKPI(db, calculation, input.periodStart, input.periodEnd);
            break;
          case 'performance':
            value = await calculatePerformanceKPI(db, calculation, input.periodStart, input.periodEnd);
            break;
          default:
            value = 0;
        }

        // Store calculated value
        await db.execute(sql`
          INSERT INTO kpiValues (kpiId, periodType, periodStart, periodEnd, value, calculatedAt)
          VALUES (${input.kpiId}, ${input.periodType}, ${input.periodStart}, 
                  ${input.periodEnd}, ${value}, NOW())
          ON DUPLICATE KEY UPDATE value = ${value}, calculatedAt = NOW()
        `);

        return {
          success: true,
          kpiId: input.kpiId,
          value,
          unit: kpi.unit,
          calculatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[Reporting Router] Error in calculateKPI:', error);
        throw new Error('Failed to calculate KPI');
      }
    }),

  /**
   * Get report execution history
   */
  // T14 Item 3: fieldManagerProcedure — execution history reads accessible to all admin-tier roles
  getExecutionHistory: fieldManagerProcedure
    .input(z.object({
      limit: z.number().default(50),
      templateId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        let query = 'SELECT * FROM reportExecutions WHERE 1=1';
        const params: any[] = [];

        if (input.templateId) {
          query += ' AND templateId = ?';
          params.push(input.templateId);
        }

        query += ' ORDER BY startTime DESC LIMIT ?';
        params.push(input.limit);

        const result = await db.execute(sql.raw(query, params));
        return result[0] as any[];
      } catch (error) {
        console.error('[Reporting Router] Error in getExecutionHistory:', error);
        return [];
      }
    }),

  /**
   * Get all scheduled reports for the current user
   */
  // T14 Item 3: fieldManagerProcedure — scheduled reports reads accessible to all admin-tier roles
  getScheduledReports: fieldManagerProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const result = await db.execute(sql`
          SELECT 
            sr.*,
            rt.name as templateName
          FROM scheduledReports sr
          JOIN reportTemplates rt ON sr.templateId = rt.id
          ORDER BY sr.createdAt DESC
        `);
        return result[0] as any[];
      } catch (error) {
        console.error('[Reporting Router] Error in getScheduledReports:', error);
        return [];
      }
    }),

  /**
   * Create a new scheduled report
   */
  // T14 Item 3: adminProcedure — scheduled report creation is admin-tier
  createScheduledReport: adminProcedure
    .input(z.object({
      templateId: z.number(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      recipients: z.string(),
      format: z.enum(['pdf', 'excel', 'csv']),
      filters: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Calculate next run time
        const now = new Date();
        const nextRun = new Date(now);
        
        switch (input.frequency) {
          case 'daily':
            nextRun.setDate(nextRun.getDate() + 1);
            break;
          case 'weekly':
            nextRun.setDate(nextRun.getDate() + 7);
            break;
          case 'monthly':
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
        }

        const result = await db.execute(sql`
          INSERT INTO scheduledReports 
          (templateId, userId, schedule, frequency, recipients, format, filters, isActive, nextRun)
          VALUES (
            ${input.templateId}, 
            ${ctx.user.id}, 
            ${input.frequency}, 
            ${input.frequency}, 
            ${input.recipients}, 
            ${input.format}, 
            ${JSON.stringify(input.filters || {})}, 
            1, 
            ${nextRun.toISOString()}
          )
        `);
        
        return { success: true, id: result[0].insertId };
      } catch (error) {
        console.error('[Reporting Router] Error in createScheduledReport:', error);
        throw new Error('Failed to create scheduled report');
      }
    }),

  /**
   * Toggle scheduled report active status
   */
  // T14 Item 3: adminProcedure — scheduled report management is admin-tier
  toggleScheduledReport: adminProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        await db.execute(sql`
          UPDATE scheduledReports 
          SET isActive = ${input.isActive ? 1 : 0}
          WHERE id = ${input.id} AND userId = ${ctx.user.id}
        `);
        
        return { success: true };
      } catch (error) {
        console.error('[Reporting Router] Error in toggleScheduledReport:', error);
        throw new Error('Failed to toggle scheduled report');
      }
    }),

  /**
   * Delete a scheduled report
   */
  // T14 Item 3: adminProcedure — scheduled report deletion is admin-tier
  deleteScheduledReport: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        await db.execute(sql`
          DELETE FROM scheduledReports 
          WHERE id = ${input.id} AND userId = ${ctx.user.id}
        `);
        
        return { success: true };
      } catch (error) {
        console.error('[Reporting Router] Error in deleteScheduledReport:', error);
        throw new Error('Failed to delete scheduled report');
      }
    }),
});

