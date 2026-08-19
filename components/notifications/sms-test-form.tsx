"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendSmsTest } from "@/app/(dashboard)/notifications/sms-test/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SmsTestForm({ disabled }: { disabled: boolean }) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("EduTap SMS gateway test.");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const input = {
      recipient: String(formData.get("recipient") ?? ""),
      message: String(formData.get("message") ?? "")
    };

    startTransition(async () => {
      const result = await sendSmsTest(input);
      if (result.ok) {
        toast.success(result.target ? `Sent to ${result.target}` : result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient</Label>
        <Input
          id="recipient"
          name="recipient"
          inputMode="tel"
          placeholder="94761234567"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          disabled={disabled || isPending}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          maxLength={1500}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={disabled || isPending}
          required
        />
        <p className="text-xs text-muted-foreground">{message.length}/1500 characters</p>
      </div>

      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send test SMS
      </Button>
    </form>
  );
}
