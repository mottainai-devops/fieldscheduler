import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';

interface AbatementNoticeData {
  noticeNumber: string;
  customerName: string;
  customerAddress: string;
  issueDate: Date;
  dueDate: Date;
  violations: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  issuedBy: string;
  notes?: string;
}

interface ComplianceReportData {
  reportDate: Date;
  totalCustomers: number;
  activeViolations: number;
  resolvedViolations: number;
  violationsByType: Array<{
    type: string;
    count: number;
  }>;
  recentViolations: Array<{
    customerName: string;
    violationType: string;
    date: Date;
    status: string;
  }>;
}

export function generateAbatementNoticePDF(data: AbatementNoticeData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .text('ABATEMENT NOTICE', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12).font('Helvetica')
        .text(`Notice Number: ${data.noticeNumber}`, { align: 'right' });
      
      doc.moveDown(2);

      // Customer Information
      doc.fontSize(14).font('Helvetica-Bold')
        .text('TO:', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica')
        .text(data.customerName)
        .text(data.customerAddress);
      
      doc.moveDown(2);

      // Notice Details
      doc.fontSize(12)
        .text(`Date of Issue: ${data.issueDate.toLocaleDateString()}`)
        .text(`Compliance Due Date: ${data.dueDate.toLocaleDateString()}`);
      
      doc.moveDown(2);

      // Violations Section
      doc.fontSize(14).font('Helvetica-Bold')
        .text('VIOLATIONS IDENTIFIED:', { underline: true });
      
      doc.moveDown(1);

      data.violations.forEach((violation, index) => {
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`${index + 1}. ${violation.type}`);
        
        doc.fontSize(11).font('Helvetica')
          .text(`   Severity: ${violation.severity.toUpperCase()}`, { indent: 20 });
        
        if (violation.description) {
          doc.text(`   Description: ${violation.description}`, { indent: 20 });
        }
        
        doc.moveDown(0.5);
      });

      doc.moveDown(2);

      // Required Actions
      doc.fontSize(14).font('Helvetica-Bold')
        .text('REQUIRED ACTIONS:', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica')
        .text('You are hereby required to take immediate corrective action to address the above violations. Failure to comply by the due date may result in:')
        .text('• Additional penalties and fines', { indent: 20 })
        .text('• Legal action', { indent: 20 })
        .text('• Service suspension', { indent: 20 });
      
      doc.moveDown(2);

      // Additional Notes
      if (data.notes) {
        doc.fontSize(12).font('Helvetica-Bold')
          .text('ADDITIONAL NOTES:');
        
        doc.fontSize(11).font('Helvetica')
          .text(data.notes);
        
        doc.moveDown(2);
      }

      // Footer
      doc.fontSize(10).font('Helvetica')
        .text(`Issued by: ${data.issuedBy}`, { align: 'left' })
        .moveDown(3)
        .text('_________________________', { align: 'left' })
        .text('Authorized Signature', { align: 'left' });

      // Page number
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateComplianceReportPDF(data: ComplianceReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .text('COMPLIANCE REPORT', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12).font('Helvetica')
        .text(`Report Date: ${data.reportDate.toLocaleDateString()}`, { align: 'right' });
      
      doc.moveDown(2);

      // Summary Statistics
      doc.fontSize(16).font('Helvetica-Bold')
        .text('SUMMARY', { underline: true });
      
      doc.moveDown(1);

      // Statistics table
      const tableTop = doc.y;
      const colWidth = 250;
      
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Metric', 50, tableTop)
        .text('Value', 50 + colWidth, tableTop);
      
      doc.moveDown(0.5);
      doc.strokeColor('#cccccc').lineWidth(1)
        .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      
      doc.moveDown(0.5);

      const stats = [
        ['Total Customers', data.totalCustomers.toString()],
        ['Active Violations', data.activeViolations.toString()],
        ['Resolved Violations', data.resolvedViolations.toString()],
        ['Compliance Rate', `${((1 - data.activeViolations / data.totalCustomers) * 100).toFixed(1)}%`]
      ];

      doc.font('Helvetica');
      stats.forEach(([metric, value]) => {
        const y = doc.y;
        doc.text(metric, 50, y)
          .text(value, 50 + colWidth, y);
        doc.moveDown(0.8);
      });

      doc.moveDown(2);

      // Violations by Type
      doc.fontSize(16).font('Helvetica-Bold')
        .text('VIOLATIONS BY TYPE', { underline: true });
      
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold')
        .text('Violation Type', 50)
        .text('Count', 400);
      
      doc.moveDown(0.5);
      doc.strokeColor('#cccccc').lineWidth(1)
        .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      
      doc.moveDown(0.5);

      doc.font('Helvetica');
      data.violationsByType.forEach(({ type, count }) => {
        const y = doc.y;
        doc.text(type, 50, y)
          .text(count.toString(), 400, y);
        doc.moveDown(0.8);
      });

      doc.moveDown(2);

      // Recent Violations
      if (data.recentViolations.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
          .text('RECENT VIOLATIONS', { underline: true });
        
        doc.moveDown(1);

        doc.fontSize(10).font('Helvetica-Bold')
          .text('Customer', 50)
          .text('Type', 200)
          .text('Date', 350)
          .text('Status', 450);
        
        doc.moveDown(0.5);
        doc.strokeColor('#cccccc').lineWidth(1)
          .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        
        doc.moveDown(0.5);

        doc.font('Helvetica');
        data.recentViolations.slice(0, 15).forEach((violation) => {
          const y = doc.y;
          
          // Check if we need a new page
          if (y > 700) {
            doc.addPage();
          }
          
          doc.fontSize(9)
            .text(violation.customerName.substring(0, 25), 50, doc.y, { width: 140 })
            .text(violation.violationType.substring(0, 20), 200, y, { width: 140 })
            .text(violation.date.toLocaleDateString(), 350, y)
            .text(violation.status, 450, y);
          
          doc.moveDown(0.8);
        });
      }

      // Footer
      doc.fontSize(8).font('Helvetica')
        .text(
          '© 2024 Field Worker Scheduler - Environmental Compliance Management System',
          50,
          doc.page.height - 30,
          { align: 'center' }
        );

      // Page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pages.count}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

