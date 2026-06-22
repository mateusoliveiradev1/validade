import * as React from "react";
import { cn } from "../../lib/utils";

function DropdownMenu({
  label,
  children,
  className,
}: React.ComponentProps<"details"> & { label: string }) {
  return (
    <details className={cn("relative", className)}>
      <summary className="h-11 cursor-pointer list-none rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground">
        {label}
      </summary>
      <div className="absolute right-0 z-10 mt-2 min-w-44 rounded-lg border border-border bg-card p-2 shadow-lg">
        {children}
      </div>
    </details>
  );
}

export { DropdownMenu };
