import * as React from "react";

import { cn } from "../../lib/utils";

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div data-slot="sheet" className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar painel de detalhe"
        className="absolute inset-0 bg-foreground/15"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

const SheetContent = React.forwardRef<
  HTMLElement,
  React.ComponentProps<"aside"> & { side?: "right" | "bottom" }
>(function SheetContent({ className, side = "right", ...props }, ref) {
  return (
    <aside
      ref={ref}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      data-slot="sheet-content"
      className={cn(
        "absolute bg-popover text-popover-foreground outline-none",
        side === "right"
          ? "right-0 top-0 h-full w-full max-w-[440px] border-l border-border"
          : "bottom-0 left-0 max-h-[90vh] w-full border-t border-border",
        className,
      )}
      {...props}
    />
  );
});

export { Sheet, SheetContent };
