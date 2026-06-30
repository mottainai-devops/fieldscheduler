import { publicProcedure, adminProcedure, workerProcedure, router, driftLogger } from "../_core/trpc";
import { z } from "zod";

export const paymentsRouter = router({
  // T25: Migrated from publicProcedure to workerProcedure (closes SECURITY_DEBT.md item).
  // workerId now derived from ctx (Bearer token) — not accepted from client.
  // Flutter client still sends workerId in payload (legacy) — silently stripped by Zod
  // (same harmless drift as T20 procedures). React client updated to not send workerId.
  // T16 Item 5: driftLogger applied
  uploadPaymentProof: workerProcedure
    .use(driftLogger('uploadPaymentProof', {
      shape: {
        customerId: true, invoiceId: true,
        fileData: true, fileName: true, fileType: true,
        notes: true, amount: true, paymentMethod: true,
      }
    }))
    .input(z.object({
      customerId: z.number(),
      invoiceId: z.string().optional(),
      fileData: z.string(), // base64 encoded
      fileName: z.string(),
      fileType: z.string(),
      notes: z.string().optional(),
      amount: z.string().optional(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { uploadPaymentProof } = await import("../storageService");
      const { createPaymentEvidence, createNotification } = await import("../paymentEvidenceDb");
      const { getCustomerById, getWorkerById } = await import("../fieldWorkerDb");

      const { fileUrl, fileKey } = await uploadPaymentProof(
        input.fileData,
        input.fileName,
        input.fileType,
        input.customerId
      );

      const evidenceId = await createPaymentEvidence({
        customerId: input.customerId,
        invoiceId: input.invoiceId,
        workerId: ctx.workerId,
        fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        notes: input.notes,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      });

      const customer = await getCustomerById(input.customerId);
      const worker = await getWorkerById(ctx.workerId);

      await createNotification({
        type: "payment_upload",
        title: "New Payment Proof Uploaded",
        message: `${worker?.name || "Worker"} uploaded payment proof for ${customer?.name || "customer"}${input.amount ? ` - Amount: ₦${input.amount}` : ""}`,
        relatedId: evidenceId,
      });

      return { success: true, evidenceId, fileUrl };
    }),

  // Get payment evidence for a customer
  getPaymentEvidence: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const { getPaymentEvidenceByCustomer } = await import("../paymentEvidenceDb");
      return await getPaymentEvidenceByCustomer(input.customerId);
    }),

  // T14 Item 3: adminProcedure — triggers email/SMS to customers, admin-tier operation.
  // Adjustment 1: initial mapping classified this as "keep public" (mobile-adjacent file context).
  // Handler audit (Condition 2) revealed it's admin-facing. Corrected per Rule 40.
  sendPaymentReminder: adminProcedure
    .input(z.object({
      customerId: z.number(),
      invoiceId: z.string(),
      amount: z.string(),
      dueDate: z.string(),
      method: z.enum(["email", "sms", "both"]),
    }))
    .mutation(async ({ input }) => {
      const { getCustomerById } = await import("../fieldWorkerDb");
      const customer = await getCustomerById(input.customerId);
      if (!customer) throw new Error("Customer not found");

      console.log("Payment reminder queued:", {
        customer: customer.name,
        invoice: input.invoiceId,
        amount: input.amount,
        dueDate: input.dueDate,
        method: input.method,
      });

      return {
        success: true,
        message: `Payment reminder sent via ${input.method}`,
      };
    }),
});
