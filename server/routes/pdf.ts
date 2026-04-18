import express, { Request, Response } from "express";
import puppeteer from "puppeteer";
import { getCustomerStatement } from "../services/zoho";

export const pdfRouter = express.Router();

/**
 * Hardening: headless Chromium + stable flags.
 * - printBackground: true (so CSS backgrounds render)
 * - exact print color adjust (so content isn't "white on white")
 * - wait for DOM, network idle, and font load
 */
async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
      "--disable-gpu",
    ],
  })

  try {
    const page = await browser.newPage();

    // Big readable viewport (prevents 0x0 layout edge cases)
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });

    // Force visible text & backgrounds no matter what the template does
    await page.setContent(
      [
        `<!doctype html><html lang="en"><head>`,
        `<meta charset="utf-8" />`,
        `<meta http-equiv="X-UA-Compatible" content="IE=edge" />`,
        `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
        // Print safety net: ensure dark text on white and preserve colors
        `<style>
          html, body { background: #ffffff !important; color: #111111 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
          @page { size: A4; margin: 18mm; }
        </style>`,
        `</head><body>`,
        html,
        `</body></html>`,
      ].join("")
    );

    // Wait for content to load
    await page.waitForNavigation({ waitUntil: ["domcontentloaded", "networkidle0"] }).catch(() => {
      // Navigation may not occur, that's ok
    });

    // Use on-screen CSS (not 'print') so you control layout predictably
    await page.emulateMediaType("screen");

    // Ensure custom/web fonts are ready before PDF snapshot
    // (If you use Google Fonts or @font-face, this is critical.)
    // Safe even if no custom fonts are present:
    await page.evaluate(async () => {
      // @ts-ignore
      if (document?.fonts?.ready) {
        await (document as any).fonts.ready;
      }
    });

    // Give any late layout a tick to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/** Minimal, safe HTML builder (server-side) */
function generateStatementHTML(statementData: any) {
  const contactName = statementData.contact_name || "Unknown Customer";
  const contactCode = statementData.contact_id || "N/A";
  const invoices = statementData.invoices || [];
  
  // Calculate totals
  const total = invoices.reduce((sum: number, inv: any) => sum + (parseFloat(inv.total) || 0), 0);
  const paidAmount = invoices.filter((inv: any) => inv.status === 'paid').reduce((sum: number, inv: any) => sum + (parseFloat(inv.total) || 0), 0);
  const balance = total - paidAmount;
  
  const rows = invoices
    .map(
      (inv: any) => `<tr>
      <td>${inv.invoice_number || '-'}</td>
      <td>${inv.date || '-'}</td>
      <td>${inv.due_date || '-'}</td>
      <td style="text-align:right">${parseFloat(inv.total || 0).toFixed(2)}</td>
      <td>${inv.status || '-'}</td>
    </tr>`
    )
    .join("");

  return `
    <h1 style="margin:0 0 8px 0; color: #111111;">Customer Statement</h1>
    <div style="margin:0 0 16px 0; font-size:13px; color: #111111;">
      <div><strong>Customer:</strong> ${contactName} (${contactCode})</div>
      <div><strong>Currency:</strong> NGN</div>
      <div><strong>Total:</strong> ₦${total.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div><strong>Balance:</strong> ₦${balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <table style="color: #111111;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th>Invoice #</th>
          <th>Date</th>
          <th>Due Date</th>
          <th style="text-align:right">Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/** --------- ROUTES ---------- */

/** A: HTML DEBUG VIEW (open in browser to confirm HTML actually renders) */
pdfRouter.get("/api/statements/:id.debug", async (req: Request, res: Response) => {
  try {
    const statement = await getCustomerStatement(req.params.id);

    if (!statement) {
      return res.status(404).json({ error: "Statement not found" });
    }

    const html = generateStatementHTML(statement);
    res.type("html").status(200).send(
      `<!doctype html>
     <meta charset="utf-8">
     <title>Statement Debug</title>
     <style>body{font-family:system-ui, Arial, sans-serif; padding:24px; color: #111111;}</style>
     ${html}`
    );
  } catch (err: any) {
    console.error("[PDF Debug] Error:", err?.message || err);
    console.error("[PDF Debug] Stack:", err?.stack);
    res.status(500).json({ error: "Failed to load debug view", details: err?.message });
  }
});

/** B: PDF BYTES (no base64 anywhere—browser-native) */
pdfRouter.get("/api/statements/:id.pdf", async (req: Request, res: Response) => {
  try {
    const statement = await getCustomerStatement(req.params.id);

    if (!statement) {
      return res.status(404).json({ error: "Statement not found" });
    }

    const html = generateStatementHTML(statement);
    const buf = await renderHtmlToPdfBuffer(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="statement-${req.params.id}.pdf"`);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(buf);
  } catch (err: any) {
    console.error("[PDF Render] Error:", err?.message || err);
    console.error("[PDF Render] Stack:", err?.stack);
    res.status(500).json({ error: "Failed to render PDF", details: err?.message });
  }
});

/** C: Smoke test (sanity PDF) */
pdfRouter.get("/api/test.pdf", async (_req: Request, res: Response) => {
  try {
    const buf = await renderHtmlToPdfBuffer(
      `<h1 style="color: #111111;">PDF OK ✓</h1><p style="color: #111111;">If you can read this, rendering is healthy.</p>`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="test.pdf"');
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(buf);
  } catch (err: any) {
    console.error("[PDF Test] Error:", err?.message || err);
    console.error("[PDF Test] Stack:", err?.stack);
    res.status(500).json({ error: "Failed to generate test PDF", details: err?.message });
  }
});

export default pdfRouter;

