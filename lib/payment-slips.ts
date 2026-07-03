import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const FILE_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"]
} as const;

export const paymentSlipMaxMb = Math.max(
  1,
  Number(process.env.PAYMENT_SLIP_MAX_MB || process.env.NEXT_PUBLIC_PAYMENT_SLIP_MAX_MB || 5)
);
export const paymentSlipMaxBytes = paymentSlipMaxMb * 1024 * 1024;

export const paymentDetailsSchema = z.object({
  paidAmount: z.coerce.number().positive("Paid amount must be greater than zero.").max(99999999),
  paymentMethod: z.enum(["BANK_TRANSFER", "CASH_DEPOSIT", "ONLINE_TRANSFER", "OTHER"]),
  paymentDate: z.string().trim().min(1, "Payment date is required."),
  referenceNumber: z.string().trim().max(120, "Reference number is too long.").optional().or(z.literal(""))
}).superRefine((data, context) => {
  const date = new Date(`${data.paymentDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    context.addIssue({ code: "custom", path: ["paymentDate"], message: "Enter a valid payment date." });
  } else {
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);
    if (date > tomorrow) context.addIssue({ code: "custom", path: ["paymentDate"], message: "Payment date cannot be in the future." });
  }
});

export type ValidatedPaymentSlip = {
  bytes: Uint8Array;
  extension: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

function extensionOf(fileName: string) {
  return path.extname(fileName).slice(1).toLowerCase();
}

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  if (type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  return false;
}

export async function validatePaymentSlip(file: FormDataEntryValue | null): Promise<ValidatedPaymentSlip> {
  if (!(file instanceof File) || file.size === 0) throw new Error("Upload a payment slip.");
  if (file.size > paymentSlipMaxBytes) throw new Error(`Payment slips must be ${paymentSlipMaxMb} MB or smaller.`);

  const allowedExtensions = FILE_TYPES[file.type as keyof typeof FILE_TYPES];
  const extension = extensionOf(file.name);
  if (!allowedExtensions || !allowedExtensions.includes(extension as never)) {
    throw new Error("Use a JPG, JPEG, PNG, WebP, or PDF payment slip.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(file.type, bytes)) throw new Error("The uploaded payment slip does not match its file type.");

  return {
    bytes,
    extension: extension === "jpeg" ? "jpg" : extension,
    fileName: path.basename(file.name).replace(/[^\w.\- ()]/g, "_").slice(0, 180),
    fileType: file.type,
    fileSize: file.size
  };
}

function storageRoot() {
  const configured = process.env.PAYMENT_SLIP_STORAGE_DIR;
  return configured
    ? path.resolve(configured)
    : path.join(/* turbopackIgnore: true */ process.cwd(), ".private", "payment-slips");
}

function resolveStorageKey(storageKey: string) {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(storageKey)) throw new Error("Invalid payment slip storage key.");
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid payment slip storage path.");
  return resolved;
}

export function createPaymentSlipStorageKey(instituteId: string, extension: string) {
  return `${instituteId}/${randomUUID()}.${extension}`;
}

export async function savePaymentSlip(storageKey: string, bytes: Uint8Array) {
  const destination = resolveStorageKey(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });
}

export async function readPaymentSlip(storageKey: string) {
  return readFile(resolveStorageKey(storageKey));
}

export async function removePaymentSlip(storageKey: string | null | undefined) {
  if (!storageKey) return;
  await unlink(resolveStorageKey(storageKey)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") console.error("Could not remove old payment slip", error);
  });
}

export function paymentMethodForLedger(method: string) {
  if (method === "BANK_TRANSFER") return "BANK_TRANSFER" as const;
  if (method === "CASH_DEPOSIT") return "CASH" as const;
  if (method === "ONLINE_TRANSFER") return "ONLINE" as const;
  return "OTHER" as const;
}
