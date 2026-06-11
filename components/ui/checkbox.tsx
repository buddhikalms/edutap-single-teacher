import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn("h-4 w-4 rounded border-input text-primary premium-focus", className)}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };
