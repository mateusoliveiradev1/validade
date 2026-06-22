import * as React from "react";
import { cn } from "../../lib/utils";

export function AlertDialog({ children, className }: React.ComponentProps<"section">) {
  return (
    <section
      role="alertdialog"
      aria-live="polite"
      className={cn("rounded-lg border border-warning-border bg-warning-surface p-4", className)}
    >
      {children}
    </section>
  );
}

export function AlertDialogTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm leading-5 text-foreground", className)} {...props} />;
}
