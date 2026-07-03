"use server";

import { revalidatePath } from "next/cache";
import { CardPrintBatchStatus } from "@prisma/client";
import { generateCardPrintBatch, updateCardPrintBatchStatus, canManageCardPrintExport } from "@/lib/card-print-export";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";

export type GenerateCardPrintBatchActionInput = {
  title?: string;
  notes?: string;
  studentIds: string[];
  prefix?: string;
  cardNumberMode?: "AUTO" | "MANUAL";
  manualCardNumbers?: Record<string, string>;
};

export async function generateCardPrintBatchAction(
  input: GenerateCardPrintBatchActionInput
): Promise<ActionState & { batchId?: string; batchNumber?: string }> {
  try {
    const { instituteId, userId, role } = await getTenantContext();
    if (!canManageCardPrintExport(role)) {
      return { ok: false, message: "You do not have access to export card print data." };
    }

    const batch = await generateCardPrintBatch(instituteId, userId, input);
    revalidatePath("/dashboard/card-print-export");
    return { ok: true, message: `Batch ${batch.batchNumber} is ready for export.`, batchId: batch.id, batchNumber: batch.batchNumber };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }
    return actionError(error, "Could not generate card print batch.");
  }
}

export async function updateCardPrintBatchStatusAction(batchId: string, status: CardPrintBatchStatus): Promise<ActionState> {
  try {
    const { instituteId, role } = await getTenantContext();
    if (!canManageCardPrintExport(role)) {
      return { ok: false, message: "You do not have access to update card print batches." };
    }

    const batch = await updateCardPrintBatchStatus(instituteId, batchId, status);
    revalidatePath("/dashboard/card-print-export");
    return { ok: true, message: `Batch ${batch.batchNumber} marked ${batch.status.toLowerCase().replaceAll("_", " ")}.` };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }
    return actionError(error, "Could not update card print batch.");
  }
}
