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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div data-slot="sheet" className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar painel de detalhe"
        className="fixed inset-0 bg-foreground/35"
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
        "fixed z-50 bg-popover text-popover-foreground outline-none",
        side === "right"
          ? "inset-y-0 right-0 h-dvh w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto border-l border-border shadow-[-4px_0_8px_color-mix(in_oklch,var(--foreground),transparent_88%)]"
          : "inset-x-0 bottom-0 max-h-[90dvh] w-full overflow-y-auto border-t border-border shadow-[0_-4px_8px_color-mix(in_oklch,var(--foreground),transparent_88%)]",
        className,
      )}
      {...props}
    />
  );
});

export { Sheet, SheetContent };
