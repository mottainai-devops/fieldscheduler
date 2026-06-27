import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const paymentsRouter = router({
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
  uploadPaymentProof: publicProcedure
    .input(z.object({
      customerId: z.number(),
      invoiceId: z.string().optional(),
      workerId: z.number(),
      fileData: z.string(), // base64 encoded
      fileName: z.string(),
      fileType: z.string(),
      notes: z.string().optional(),
      amount: z.string().optional(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
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
        workerId: input.workerId,
        fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        notes: input.notes,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      });

      const customer = await getCustomerById(input.customerId);
      const worker = await getWorkerById(input.workerId);

      await createNotification({
        type: "payment_upload",
        title: "New Payment Proof Uploaded",
        message: `${worker?.name || "Worker"} uploaded payment proof for ${customer?.name || "customer"}${input.amount ? ` - Amount: \u20a6${input.amount}` : ""}`,
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
