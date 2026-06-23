import { Menu, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent } from "../components/ui/sheet";

export type AppRoute = "command" | "access" | "audit";

const navItems: Array<{ id: AppRoute; label: string }> = [
  { id: "command", label: "Command Center" },
  { id: "access", label: "Acessos da loja" },
  { id: "audit", label: "Auditoria" },
];

export function AppShell({
  children,
  route,
  session,
  onLogout,
  onOpenPrivacy,
  onRouteChange,
}: {
  children: ReactNode;
  route: AppRoute;
  session: SessionContextResponse;
  onLogout: () => void;
  onOpenPrivacy: () => void;
  onRouteChange: (route: AppRoute) => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar p-4 md:flex md:flex-col">
        <ShellNavigation route={route} onRouteChange={onRouteChange} />
      </aside>
      <main className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background px-4 py-3 md:px-8">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.store.storeName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {session.actor.displayName ?? session.actor.subjectId} -{" "}
                {roleLabel(session.activeRole)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="hidden md:inline-flex" variant="ghost" onClick={onOpenPrivacy}>
                Privacidade
              </Button>
              <Button className="hidden md:inline-flex" variant="outline" onClick={onLogout}>
                Sair da conta
              </Button>
              <MobileNavigation route={route} onRouteChange={onRouteChange} />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}

function ShellNavigation({
  route,
  onRouteChange,
}: {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}) {
  return (
    <nav aria-label="Navegacao principal" className="grid gap-2">
      <div className="mb-5 flex items-center gap-3">
        <div
          className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="text-base font-semibold">Validade Zero</p>
          <p className="text-sm text-muted-foreground">Operacao de risco zero</p>
        </div>
      </div>
      {navItems.map((item) => (
        <Button
          key={item.id}
          aria-current={route === item.id ? "page" : undefined}
          className="justify-start"
          variant={route === item.id ? "secondary" : "ghost"}
          onClick={() => onRouteChange(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}

function MobileNavigation({
  route,
  onRouteChange,
}: {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="md:hidden"
        size="icon"
        variant="outline"
        aria-label="Abrir navegacao"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-4">
          <ShellNavigation
            route={route}
            onRouteChange={(nextRoute) => {
              onRouteChange(nextRoute);
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function roleLabel(role: SessionContextResponse["activeRole"]): string {
  if (role === "admin") return "Administracao";
  if (role === "lead") return "Lideranca";
  return "Colaborador";
}
