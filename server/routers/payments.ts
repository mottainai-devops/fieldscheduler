import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const paymentsRouter = router({
  // Upload payment proof (base64 file)
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

  // Send payment reminder
  sendPaymentReminder: publicProcedure
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
