#!/usr/bin/env node
/**
 * Deadline Reminder Cron Script
 * Sends email reminders to customers whose abatement notice due date is in 3 days
 * Run daily via cron: 0 8 * * * /usr/bin/node /home/ubuntu/field-worker-scheduler/scripts/deadline_reminder.js
 */

const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '/home/ubuntu/field-worker-scheduler/.env' });

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'fieldworker',
  password: 'FieldWorker2024Secure',
  database: 'fieldworker_db',
};

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hmailplus.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'notifications@fieldscheduler.net',
    pass: process.env.SMTP_PASS || '?Niys8A8VI[8',
  },
};

const FROM_EMAIL = '"Field Scheduler Notifications" <notifications@fieldscheduler.net>';

function buildReminderEmail(customerName, noticeNumber, dueDate) {
  const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #e65c00; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .body { padding: 32px; color: #333; }
    .notice-box { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin: 20px 0; }
    .notice-box p { margin: 4px 0; font-size: 14px; }
    .deadline { font-size: 20px; font-weight: bold; color: #e65c00; }
    .footer { background: #f8f8f8; padding: 16px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .btn { display: inline-block; background: #e65c00; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Compliance Deadline Reminder</h1>
    </div>
    <div class="body">
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>This is a reminder that your abatement notice compliance deadline is <strong>3 days away</strong>. Please take immediate action to avoid escalation.</p>
      
      <div class="notice-box">
        <p><strong>Notice Number:</strong> ${noticeNumber || 'N/A'}</p>
        <p><strong>Compliance Deadline:</strong></p>
        <p class="deadline">${dueDateFormatted}</p>
      </div>

      <p>To avoid further enforcement action, please ensure full compliance with the requirements stated in your abatement notice before the deadline.</p>
      
      <p>If you have already complied or have questions, please contact our compliance team immediately.</p>

      <p style="margin-top: 24px;">Regards,<br><strong>Field Scheduler Compliance Team</strong></p>
    </div>
    <div class="footer">
      This is an automated reminder from Field Scheduler. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;

  const text = `Dear ${customerName},

This is a reminder that your abatement notice compliance deadline is 3 days away.

Notice Number: ${noticeNumber || 'N/A'}
Compliance Deadline: ${dueDateFormatted}

Please ensure full compliance before the deadline to avoid escalation.

Regards,
Field Scheduler Compliance Team`;

  return { html, text };
}

async function sendDeadlineReminders() {
  console.log(`[${new Date().toISOString()}] Starting deadline reminder job...`);

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);

    // Find abatement notices due in exactly 3 days that are still pending
    // and haven't had a reminder sent yet
    const [notices] = await connection.execute(`
      SELECT 
        an.id,
        an.noticeNumber,
        an.dueDate,
        an.customerId,
        c.name AS customerName,
        c.email AS customerEmail
      FROM abatementNotices an
      JOIN customers c ON c.id = an.customerId
      WHERE 
        an.status = 'pending'
        AND an.dueDate IS NOT NULL
        AND DATE(an.dueDate) = DATE(DATE_ADD(NOW(), INTERVAL 3 DAY))
        AND (an.reminderSentAt IS NULL OR an.reminderSentAt = '')
    `);

    console.log(`Found ${notices.length} notices due in 3 days`);

    if (notices.length === 0) {
      console.log('No reminders to send today.');
      if (connection) await connection.end();
      return;
    }

    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    let sent = 0;
    let failed = 0;

    for (const notice of notices) {
      if (!notice.customerEmail) {
        console.log(`Skipping notice ${notice.id} - no email for customer ${notice.customerName}`);
        continue;
      }

      const { html, text } = buildReminderEmail(
        notice.customerName,
        notice.noticeNumber,
        notice.dueDate
      );

      try {
        await transporter.sendMail({
          from: FROM_EMAIL,
          to: notice.customerEmail,
          subject: `⚠️ Compliance Deadline Reminder - ${notice.noticeNumber || 'Abatement Notice'} Due in 3 Days`,
          text,
          html,
        });

        // Mark reminder as sent
        await connection.execute(
          `UPDATE abatementNotices SET reminderSentAt = NOW() WHERE id = ?`,
          [notice.id]
        );

        // Create admin notification
        await connection.execute(
          `INSERT INTO notifications (type, title, message, relatedId, isRead) VALUES (?, ?, ?, ?, 0)`,
          [
            'reminder',
            'Deadline Reminder Sent',
            `3-day reminder sent to ${notice.customerName} for notice ${notice.noticeNumber || notice.id}`,
            notice.id
          ]
        );

        console.log(`✅ Reminder sent to ${notice.customerEmail} for notice ${notice.noticeNumber || notice.id}`);
        sent++;
      } catch (emailErr) {
        console.error(`❌ Failed to send to ${notice.customerEmail}:`, emailErr.message);
        failed++;
      }
    }

    console.log(`[${new Date().toISOString()}] Done. Sent: ${sent}, Failed: ${failed}`);
  } catch (err) {
    console.error('Fatal error in deadline reminder job:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

sendDeadlineReminders();
