import { normalizeSmsRecipient, sendSmsLenzSms } from "../lib/smslenz-sms";

async function main() {
  const [, , rawRecipient, ...messageParts] = process.argv;
  const message = messageParts.join(" ").trim() || "EduTap SMSLenz SMS test message.";
  const recipient = normalizeSmsRecipient(rawRecipient);

  if (!recipient) {
    throw new Error("Usage: npm run sms:test -- 0761234567 \"Your message\"");
  }

  const result = await sendSmsLenzSms({ recipient, message });
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
