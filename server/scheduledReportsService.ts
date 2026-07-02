import { getDb } from './db';
import { scheduledReports, reportExecutions, reportTemplates } from './schema';
import { eq, and, lte } from 'drizzle-orm';
import { INVOICE_STATUS } from '../shared/constants/invoice-status';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

interface ScheduledReport {
  id: number;
  templateId: number;
  userId: number;
  schedule: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string;
  format: 'pdf' | 'excel' | 'csv';
  filters: any;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
}

interface ReportData {
  summary: any;
  data: any[];
  recordCount: number;
}

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generate report data based on template
async function generateReportData(templateId: number, filters: any): Promise<ReportData> {
  const db = getDb();
  
  // Get template configuration
  const template = await db.select().from(reportTemplates).where(eq(reportTemplates.id, templateId)).limit(1);
  
  if (!template || template.length === 0) {
    throw new Error('Template not found');
  }

  const config = template[0].config;
  const reportType = template[0].reportType;

  // Generate data based on report type
  let data: any[] = [];
  let summary: any = {};

  switch (reportType) {
    case 'customer':
      // Query customer data
      const customerQuery = `
        SELECT 
          id,
          name,
          email,
          phone,
          address,
          status,
          createdAt
        FROM customers
        WHERE 1=1
        ${filters.startDate ? `AND createdAt >= '${filters.startDate}'` : ''}
        ${filters.endDate ? `AND createdAt <= '${filters.endDate}'` : ''}
        ${filters.status ? `AND status = '${filters.status}'` : ''}
        ORDER BY createdAt DESC
        LIMIT 1000
      `;
      
      const customerResults = await db.execute(customerQuery);
      data = customerResults.rows || [];
      
      summary = {
        totalCustomers: data.length,
        activeCustomers: data.filter((c: any) => c.status === 'active').length,
        inactiveCustomers: data.filter((c: any) => c.status === 'inactive').length,
      };
      break;

    case 'route':
      // Query route data
      const routeQuery = `
        SELECT 
          r.id,
          r.name,
          r.status,
          r.assignedWorker,
          r.scheduledDate,
          COUNT(ra.id) as totalStops,
          SUM(CASE WHEN ra.status = 'completed' THEN 1 ELSE 0 END) as completedStops
        FROM routes r
        LEFT JOIN routeAssignments ra ON r.id = ra.routeId
        WHERE 1=1
        ${filters.startDate ? `AND r.scheduledDate >= '${filters.startDate}'` : ''}
        ${filters.endDate ? `AND r.scheduledDate <= '${filters.endDate}'` : ''}
        ${filters.status ? `AND r.status = '${filters.status}'` : ''}
        GROUP BY r.id
        ORDER BY r.scheduledDate DESC
        LIMIT 1000
      `;
      
      const routeResults = await db.execute(routeQuery);
      data = routeResults.rows || [];
      
      summary = {
        totalRoutes: data.length,
        completedRoutes: data.filter((r: any) => r.status === 'completed').length,
        inProgressRoutes: data.filter((r: any) => r.status === 'in_progress').length,
        totalStops: data.reduce((sum: number, r: any) => sum + (parseInt(r.totalStops) || 0), 0),
      };
      break;

    case 'worker':
      // Query worker performance data
      const workerQuery = `
        SELECT 
          w.id,
          w.name,
          w.email,
          w.status,
          COUNT(DISTINCT r.id) as totalRoutes,
          COUNT(DISTINCT ra.id) as totalAssignments,
          SUM(CASE WHEN ra.status = 'completed' THEN 1 ELSE 0 END) as completedAssignments
        FROM workers w
        LEFT JOIN routes r ON w.id = r.assignedWorker
        LEFT JOIN routeAssignments ra ON r.id = ra.routeId
        WHERE 1=1
        ${filters.startDate ? `AND r.scheduledDate >= '${filters.startDate}'` : ''}
        ${filters.endDate ? `AND r.scheduledDate <= '${filters.endDate}'` : ''}
        GROUP BY w.id
        ORDER BY completedAssignments DESC
        LIMIT 1000
      `;
      
      const workerResults = await db.execute(workerQuery);
      data = workerResults.rows || [];
      
      summary = {
        totalWorkers: data.length,
        activeWorkers: data.filter((w: any) => w.status === 'active').length,
        totalRoutesAssigned: data.reduce((sum: number, w: any) => sum + (parseInt(w.totalRoutes) || 0), 0),
        totalCompletedAssignments: data.reduce((sum: number, w: any) => sum + (parseInt(w.completedAssignments) || 0), 0),
      };
      break;

    case 'financial':
      // Query financial data
      const financialQuery = `
        SELECT 
          i.zohoInvoiceId,
          i.invoiceNumber,
          i.customerName,
          i.total,
          i.balance,
          i.status,
          i.date,
          i.dueDate
        FROM invoices i
        WHERE 1=1
        ${filters.startDate ? `AND i.date >= '${filters.startDate}'` : ''}
        ${filters.endDate ? `AND i.date <= '${filters.endDate}'` : ''}
        ${filters.status ? `AND i.status = '${filters.status}'` : ''}
        ORDER BY i.date DESC
        LIMIT 1000
      `;
      
      const financialResults = await db.execute(financialQuery);
      data = financialResults.rows || [];
      
      summary = {
        totalInvoices: data.length,
        totalAmount: data.reduce((sum: number, i: any) => sum + parseFloat(i.total || 0), 0),
        totalOutstanding: data.reduce((sum: number, i: any) => sum + parseFloat(i.balance || 0), 0),
        paidInvoices: data.filter((i: any) => i.status === INVOICE_STATUS.PAID).length,
      };
      break;

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }

  return {
    summary,
    data,
    recordCount: data.length,
  };
}

// Export report to Excel
async function exportToExcel(reportData: ReportData, templateName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add title
  worksheet.addRow([templateName]);
  worksheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
  worksheet.addRow([]);

  // Add summary
  worksheet.addRow(['Summary']);
  Object.entries(reportData.summary).forEach(([key, value]) => {
    worksheet.addRow([key, value]);
  });
  worksheet.addRow([]);

  // Add data
  if (reportData.data.length > 0) {
    // Headers
    const headers = Object.keys(reportData.data[0]);
    worksheet.addRow(headers);

    // Data rows
    reportData.data.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Style headers
    const headerRow = worksheet.getRow(worksheet.rowCount - reportData.data.length);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}

// Export report to PDF
async function exportToPDF(reportData: ReportData, templateName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).text(templateName, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(10);
    Object.entries(reportData.summary).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`);
    });
    doc.moveDown();

    // Data table (simplified - first 50 rows)
    doc.fontSize(12).text('Data', { underline: true });
    doc.fontSize(8);
    
    const dataToShow = reportData.data.slice(0, 50);
    dataToShow.forEach((row, index) => {
      doc.text(`Row ${index + 1}: ${JSON.stringify(row).substring(0, 100)}...`);
    });

    if (reportData.data.length > 50) {
      doc.text(`... and ${reportData.data.length - 50} more rows`);
    }

    doc.end();
  });
}

// Export report to CSV
function exportToCSV(reportData: ReportData): string {
  if (reportData.data.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(reportData.data[0]);
  const csvRows = [headers.join(',')];

  reportData.data.forEach(row => {
    const values = headers.map(header => {
      const value = (row as any)[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

// Send email with report attachment
async function sendReportEmail(
  recipients: string[],
  subject: string,
  reportBuffer: Buffer,
  filename: string,
  format: string
) {
  const transporter = createEmailTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || 'reports@fieldscheduler.net',
    to: recipients.join(', '),
    subject,
    html: `
      <h2>Scheduled Report</h2>
      <p>Your scheduled report has been generated and is attached to this email.</p>
      <p><strong>Report:</strong> ${subject}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Format:</strong> ${format.toUpperCase()}</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated email from Field Worker Scheduler. 
        To manage your scheduled reports, please log in to the application.
      </p>
    `,
    attachments: [
      {
        filename,
        content: reportBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}

// Main function to process scheduled reports
export async function processScheduledReports() {
  console.log('[Scheduled Reports] Starting scheduled report processing...');
  
  const db = getDb();
  const now = new Date();

  try {
    // Get all active scheduled reports that are due
    const dueReports = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.isActive, true),
          lte(scheduledReports.nextRun, now)
        )
      );

    console.log(`[Scheduled Reports] Found ${dueReports.length} reports to process`);

    for (const scheduledReport of dueReports) {
      try {
        console.log(`[Scheduled Reports] Processing report ${scheduledReport.id}...`);

        // Generate report data
        const reportData = await generateReportData(
          scheduledReport.templateId,
          scheduledReport.filters
        );

        // Get template name
        const template = await db
          .select()
          .from(reportTemplates)
          .where(eq(reportTemplates.id, scheduledReport.templateId))
          .limit(1);

        const templateName = template[0]?.name || 'Report';

        // Export report in requested format
        let reportBuffer: Buffer;
        let filename: string;

        switch (scheduledReport.format) {
          case 'excel':
            reportBuffer = await exportToExcel(reportData, templateName);
            filename = `${templateName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.xlsx`;
            break;
          case 'pdf':
            reportBuffer = await exportToPDF(reportData, templateName);
            filename = `${templateName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
            break;
          case 'csv':
            const csvContent = exportToCSV(reportData);
            reportBuffer = Buffer.from(csvContent, 'utf-8');
            filename = `${templateName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.csv`;
            break;
          default:
            throw new Error(`Unsupported format: ${scheduledReport.format}`);
        }

        // Send email
        const recipients = scheduledReport.recipients.split(',').map(r => r.trim());
        await sendReportEmail(
          recipients,
          `Scheduled Report: ${templateName}`,
          reportBuffer,
          filename,
          scheduledReport.format
        );

        // Log execution
        await db.insert(reportExecutions).values({
          templateId: scheduledReport.templateId,
          userId: scheduledReport.userId,
          filters: scheduledReport.filters,
          format: scheduledReport.format,
          status: 'success',
          recordCount: reportData.recordCount,
          generatedAt: now,
        });

        // Calculate next run time
        let nextRun = new Date(now);
        switch (scheduledReport.frequency) {
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

        // Update scheduled report
        await db
          .update(scheduledReports)
          .set({
            lastRun: now,
            nextRun,
          })
          .where(eq(scheduledReports.id, scheduledReport.id));

        console.log(`[Scheduled Reports] Successfully processed report ${scheduledReport.id}`);
      } catch (error) {
        console.error(`[Scheduled Reports] Error processing report ${scheduledReport.id}:`, error);

        // Log failed execution
        await db.insert(reportExecutions).values({
          templateId: scheduledReport.templateId,
          userId: scheduledReport.userId,
          filters: scheduledReport.filters,
          format: scheduledReport.format,
          status: 'failed',
          recordCount: 0,
          generatedAt: now,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[Scheduled Reports] Finished processing scheduled reports');
  } catch (error) {
    console.error('[Scheduled Reports] Error in processScheduledReports:', error);
  }
}

// Start the scheduled reports cron job
export function startScheduledReportsCron() {
  // Run every hour
  setInterval(() => {
    processScheduledReports();
  }, 60 * 60 * 1000); // 1 hour

  // Run immediately on startup
  processScheduledReports();
  
  console.log('[Scheduled Reports] Cron job started - running every hour');
}
