"use client";

import { useActionState, useEffect } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { changeTeacherPassword } from "@/app/(auth)/change-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeacherPasswordChangeForm() {
  const [state, action, pending] = useActionState(changeTeacherPassword, { ok: false, message: "" });

  useEffect(() => {
    if (state.message) {
      toast.error(state.message);
    }
  }, [state.message]);

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-normal">Change your password</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Replace the temporary password before opening your teacher dashboard.
        </p>
      </div>

      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </div>

        <Button className="w-full" size="lg" disabled={pending}>
          <KeyRound className="h-4 w-4" />
          Update password
        </Button>
      </form>
    </div>
  );
}
