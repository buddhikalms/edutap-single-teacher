"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { AlertTriangle, CreditCard, Loader2, Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { issueNewCard, updateCardStatus } from "@/app/(dashboard)/cards/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ActiveCard = {
  id: string;
  status: string;
};

export function StudentCardActions({ studentId, activeCard, replacementFee }: { studentId: string; activeCard?: ActiveCard | null; replacementFee?: number | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function mark(status: "LOST" | "MISSING" | "STOLEN" | "DAMAGED") {
    if (!activeCard) {
      toast.error("No active card to update.");
      return;
    }

    startTransition(async () => {
      const result = await updateCardStatus({
        cardId: activeCard.id,
        status,
        reason: status,
        notes: `Marked ${status.toLowerCase()} from student card page.`
      });

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Issue new card
        </Button>
        <Button variant="outline" onClick={() => mark("LOST")} disabled={!activeCard || pending}>
          <ShieldOff className="h-4 w-4" />
          Lost
        </Button>
        <Button variant="outline" onClick={() => mark("MISSING")} disabled={!activeCard || pending}>
          Missing
        </Button>
        <Button variant="outline" onClick={() => mark("STOLEN")} disabled={!activeCard || pending}>
          <AlertTriangle className="h-4 w-4" />
          Stolen
        </Button>
        <Button variant="outline" onClick={() => mark("DAMAGED")} disabled={!activeCard || pending}>
          Damaged
        </Button>
      </div>

      {open ? (
        <ReplacementDrawer
          studentId={studentId}
          replacementFee={replacementFee}
          pending={pending}
          startTransition={startTransition}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ReplacementDrawer({
  studentId,
  replacementFee,
  pending,
  startTransition,
  onClose
}: {
  studentId: string;
  replacementFee?: number | null;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<"LOST" | "MISSING" | "STOLEN" | "DAMAGED" | "WRONG_CARD" | "OTHER">("LOST");
  const [cardNumber, setCardNumber] = useState("");
  const [nfcUid, setNfcUid] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [notes, setNotes] = useState("");
  const [createFee, setCreateFee] = useState(Boolean(replacementFee && replacementFee > 0));

  function submit() {
    startTransition(async () => {
      const result = await issueNewCard({
        studentId,
        reason,
        cardNumber,
        nfcUid,
        qrCode,
        qrToken,
        notes,
        createReplacementFee: createFee
      });

      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-primary/35 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Close replacement form" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background p-6 shadow-luxury">
        <div className="mb-6">
          <Badge variant="secondary">Replacement wizard</Badge>
          <h2 className="mt-3 text-2xl font-semibold">Issue new card</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">The previous active card will be disabled before this new card becomes active.</p>
        </div>

        <div className="space-y-5">
          <Field label="Replacement reason">
            <Select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>
              <option value="LOST">Lost</option>
              <option value="MISSING">Missing</option>
              <option value="STOLEN">Stolen</option>
              <option value="DAMAGED">Damaged</option>
              <option value="WRONG_CARD">Wrong card assigned</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>

          <div className="rounded-xl border bg-white/75 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <CreditCard className="h-4 w-4 text-primary" />
              New physical card
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Card number">
                <Input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="CARD-0002" />
              </Field>
              <Field label="NFC UID">
                <Input value={nfcUid} onChange={(event) => setNfcUid(event.target.value)} placeholder="04:A1:..." />
              </Field>
              <Field label="QR code">
                <Input value={qrCode} onChange={(event) => setQrCode(event.target.value)} placeholder="QR-STUDENT-1002" />
              </Field>
              <Field label="QR token">
                <Input value={qrToken} onChange={(event) => setQrToken(event.target.value)} placeholder="Optional secure token" />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason, receipt note, or card batch details" />
          </Field>

          {replacementFee && replacementFee > 0 ? (
            <label className="flex items-start gap-3 rounded-xl border bg-white/70 p-4 text-sm">
              <Checkbox checked={createFee} onChange={(event) => setCreateFee(event.currentTarget.checked)} />
              <span>
                <span className="block font-semibold">Add replacement fee</span>
                <span className="mt-1 block text-muted-foreground">Create a pending Student Card Replacement Fee payment item.</span>
              </span>
            </label>
          ) : null}
        </div>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t bg-background/92 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Issue card
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
