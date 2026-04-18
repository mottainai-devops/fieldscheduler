import { Router } from "express";
import type { Request, Response } from "express";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getCustomerStatement } from "../services/zoho";

const router = Router();

/** --- SMOKE TEST: /api/test.pdf (known-good PDF) --- */
router.get("/api/test.pdf", async (_req: Request, res: Response) => {
  try {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 size
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    page.drawText("PDF OK - Test", {
      x: 72,
      y: height - 100,
      size: 24,
      font,
    });
    page.drawText("If you can read this, the browser renderer & headers are fine.", {
      x: 72,
      y: height - 130,
      size: 12,
      font,
    });

    const bytes = await pdf.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="test.pdf"');
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(Buffer.from(bytes));
  } catch (e: any) {
    console.error("[PDF Test Error]", e.message);
    res.status(500).json({ error: "Failed to generate test PDF", details: e.message });
  }
});

/** --- REAL ENDPOINT: /api/statements/:id.pdf (stream as binary) --- */
router.get("/api/statements/:id.pdf", async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    
    console.log(`[PDF] Fetching statement for contact: ${contactId}`);
    
    // Get the statement data from Zoho
    const statement = await getCustomerStatement(contactId);
    
    if (!statement?.pdfBase64) {
      return res.status(404).json({ error: "PDF not found or empty" });
    }

    // Convert base64 to binary buffer
    const buf = Buffer.from(statement.pdfBase64, "base64");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="statement-${contactId}.pdf"`);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(buf); // send raw binary
  } catch (e: any) {
    console.error("[PDF] Error:", e.message);
    res.status(500).json({ error: "Failed to render statement PDF" });
  }
});

export default router;

