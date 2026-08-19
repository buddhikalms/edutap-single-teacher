"use server";

import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { getSmsLenzConfig, normalizeSmsRecipient, sendSmsLenzSms } from "@/lib/smslenz-sms";

type SmsTestState = ActionState & {
  target?: string;
  statusCode?: number;
};

const smsTestSchema = z.object({
  recipient: z.string().min(1, "Enter a phone number."),
  message: z.string().min(1, "Enter a message.").max(1500, "SMS test message is too long.")
});

function configMessage() {
  const config = getSmsLenzConfig();
  return config.ok ? null : config.reason;
}

export async function sendSmsTest(input: { recipient: string; message: string }): Promise<SmsTestState> {
  try {
    const { instituteId, userId } = await getTenantContext();
    const missingConfig = configMessage();

    if (missingConfig) {
      return { ok: false, message: missingConfig };
    }

    const parsed = smsTestSchema.parse(input);
    const recipient = normalizeSmsRecipient(parsed.recipient);

    if (!recipient) {
      return { ok: false, message: "Enter a valid Sri Lankan mobile number, for example 0761234567 or 94761234567." };
    }

    const result = await sendSmsLenzSms({
      recipient,
      message: parsed.message.trim()
    });

    await prisma.notificationLog.create({
      data: {
        instituteId,
        userId,
        type: NotificationType.NOTICE,
        channel: NotificationChannel.SMS,
        status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
        title: "SMS gateway test",
        body: parsed.message.trim(),
        message: parsed.message.trim(),
        target: recipient,
        provider: result.provider,
        providerRef: result.providerRef ?? null,
        recipientType: "TEST",
        recipientId: userId,
        payloadJson: {
          source: "sms-test-page",
          provider: "smslenz",
          statusCode: result.statusCode
        },
        metadata: {
          providerResponse: result.response === undefined ? null : (JSON.parse(JSON.stringify(result.response)) as Prisma.InputJsonValue)
        },
        errorMessage: result.error ?? null,
        error: result.error ?? null,
        sentAt: result.ok ? new Date() : null
      }
    });

    revalidatePath("/notifications/sms-test");

    return {
      ok: result.ok,
      message: result.ok ? "Test SMS sent." : result.error || "SMSLenz rejected the SMS request.",
      target: recipient,
      statusCode: result.statusCode
    };
  } catch (error) {
    return actionError(error, "Could not send the test SMS.");
  }
}
