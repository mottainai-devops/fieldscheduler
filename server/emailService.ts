import nodemailer from "nodemailer";

// ─── Transporter ─────────────────────────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hmailplus.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

const FROM_ADDRESS = `"${process.env.EMAIL_FROM_NAME || "Field Scheduler"}" <${process.env.EMAIL_FROM || "notifications@fieldscheduler.net"}>`;

// ─── Generic send helper ─────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const t = getTransporter();
    await t.sendMail({ from: FROM_ADDRESS, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a2744;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">Field Scheduler</h1>
              <p style="margin:4px 0 0;color:#8ab4f8;font-size:13px;">Environmental Compliance Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;">
              <p style="margin:0;color:#6c757d;font-size:12px;">
                This is an automated notification from Field Scheduler.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Notification Functions ───────────────────────────────────────────────────

/**
 * Notify customer when a violation is reported against them
 */
export async function sendViolationWarningEmail(
  customerEmail: string,
  customerName: string,
  violationType: string,
  notes?: string
): Promise<boolean> {
  const subject = "Compliance Violation Notice - Field Scheduler";
  const body = `
    <h2 style="color:#dc3545;margin:0 0 16px;">Compliance Violation Reported</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      A compliance violation has been reported against your property. Please review the details below and take immediate corrective action.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;width:40%;">Violation Type</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${violationType}</td>
      </tr>
      ${notes ? `<tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Notes</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${notes}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Date Reported</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</td>
      </tr>
    </table>
    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#856404;font-size:14px;">
        <strong>Action Required:</strong> Please contact our office immediately to resolve this violation and avoid further enforcement action.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      For enquiries, please contact us at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}

/**
 * Notify customer when an abatement notice is issued
 */
export async function sendAbatementNoticeEmail(
  customerEmail: string,
  customerName: string,
  noticeNumber: string,
  violationType: string,
  dueDate?: Date,
  notes?: string
): Promise<boolean> {
  const subject = `Abatement Notice ${noticeNumber} - Field Scheduler`;
  const dueDateStr = dueDate
    ? dueDate.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : "To be advised";
  const body = `
    <h2 style="color:#dc3545;margin:0 0 16px;">Official Abatement Notice</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      An official abatement notice has been issued against your property. You are required to remedy the violation described below by the compliance deadline.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;width:40%;">Notice Number</td>
        <td style="padding:10px;border:1px solid #dee2e6;"><strong>${noticeNumber}</strong></td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Violation Type</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${violationType}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Issue Date</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Compliance Deadline</td>
        <td style="padding:10px;border:1px solid #dee2e6;color:#dc3545;font-weight:bold;">${dueDateStr}</td>
      </tr>
      ${notes ? `<tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Additional Notes</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${notes}</td>
      </tr>` : ""}
    </table>
    <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#721c24;font-size:14px;">
        <strong>Warning:</strong> Failure to comply by the deadline may result in escalation and further enforcement action including fines and penalties.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      To confirm compliance or for enquiries, please contact us at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}

/**
 * Notify customer when their violation is resolved / notice complied
 */
export async function sendResolutionConfirmationEmail(
  customerEmail: string,
  customerName: string,
  noticeNumber: string
): Promise<boolean> {
  const subject = `Compliance Resolved - Notice ${noticeNumber} - Field Scheduler`;
  const body = `
    <h2 style="color:#28a745;margin:0 0 16px;">Compliance Confirmed</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      We are pleased to confirm that your compliance with abatement notice <strong>${noticeNumber}</strong> has been verified and recorded.
    </p>
    <div style="background:#d4edda;border:1px solid #c3e6cb;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#155724;font-size:14px;">
        <strong>Status: Complied</strong> — No further action is required at this time.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      Thank you for your cooperation. Please continue to maintain compliance with all environmental regulations.
    </p>
    <p style="color:#333;line-height:1.6;">
      For enquiries, please contact us at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}

/**
 * Notify customer when notice is escalated
 */
export async function sendEscalationEmail(
  customerEmail: string,
  customerName: string,
  noticeNumber: string
): Promise<boolean> {
  const subject = `URGENT: Notice Escalated - ${noticeNumber} - Field Scheduler`;
  const body = `
    <h2 style="color:#dc3545;margin:0 0 16px;">Notice Escalated — Urgent Action Required</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      Abatement notice <strong>${noticeNumber}</strong> has been <strong>escalated</strong> due to non-compliance. This matter has been referred to senior enforcement officers for further action.
    </p>
    <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#721c24;font-size:14px;">
        <strong>Immediate Action Required:</strong> Please contact our office within 48 hours to avoid further penalties and legal proceedings.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      Contact us immediately at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}
