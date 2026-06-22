import * as React from "react";

import { cn } from "../../lib/utils";

const toneClassName = {
  neutral: "border-border bg-muted text-foreground",
  success: "border-transparent bg-accent text-accent-foreground",
  warning: "border-warning-border bg-warning text-warning-foreground",
  critical: "border-critical-border bg-critical-surface text-destructive",
} as const;

function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: keyof typeof toneClassName;
}) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClassName[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
