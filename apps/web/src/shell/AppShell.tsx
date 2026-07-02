import {
  ClipboardCheck,
  KeyRound,
  Menu,
  PackageCheck,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent } from "../components/ui/sheet";

export type AppRoute =
  | "operacao"
  | "controle-gpp"
  | "aparelhos"
  | "atualizacoes"
  | "validacao"
  | "access"
  | "audit";

interface NavItemState {
  allowed: boolean;
  reason?: string;
}

const navItems: Array<{
  id: AppRoute;
  label: string;
  description: string;
  icon: typeof ClipboardCheck;
}> = [
  {
    id: "operacao",
    label: "Operacao",
    description: "Area segura agora",
    icon: ClipboardCheck,
  },
  {
    id: "controle-gpp",
    label: "Controle GPP",
    description: "Avarias e compras internas",
    icon: PackageCheck,
  },
  {
    id: "aparelhos",
    label: "Aparelhos",
    description: "Prontidao por aparelho",
    icon: Smartphone,
  },
  {
    id: "atualizacoes",
    label: "Atualizacoes",
    description: "Build aprovado e instalada",
    icon: RefreshCw,
  },
  {
    id: "validacao",
    label: "Validacao",
    description: "Go/No-Go Loja 18",
    icon: ShieldCheck,
  },
  { id: "access", label: "Acessos da loja", description: "Convites e papeis", icon: KeyRound },
  { id: "audit", label: "Auditoria", description: "Trilha operacional", icon: ScrollText },
];

const commandCenterRoutes: ReadonlySet<AppRoute> = new Set([
  "operacao",
  "aparelhos",
  "atualizacoes",
  "validacao",
]);

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
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sidebar-border bg-sidebar p-4 md:flex md:flex-col">
        <ShellNavigation route={route} session={session} onRouteChange={onRouteChange} />
      </aside>
      <main className="min-h-screen md:pl-72">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {session.store.storeName}
              </p>
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
              <MobileNavigation
                route={route}
                session={session}
                onLogout={onLogout}
                onOpenPrivacy={onOpenPrivacy}
                onRouteChange={onRouteChange}
              />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

function ShellNavigation({
  route,
  session,
  onRouteChange,
}: {
  route: AppRoute;
  session: SessionContextResponse;
  onRouteChange: (route: AppRoute) => void;
}) {
  return (
    <nav aria-label="Navegacao principal" className="grid gap-3">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-sidebar-border bg-card/70 p-3">
        <img src="/brand-symbol.png" alt="" className="size-11 shrink-0 object-contain" />
        <div>
          <p className="text-base font-semibold leading-5">Validade Zero</p>
          <p className="text-sm text-muted-foreground">Nada vencido invisivel</p>
        </div>
      </div>
      {visibleNavItems(session).map((item) => {
        const state = navItemState(item.id, session);

        return (
          <Button
            key={item.id}
            aria-label={item.label}
            aria-current={route === item.id ? "page" : undefined}
            className="h-auto justify-start gap-3 px-3 py-3 text-left"
            disabled={!state.allowed}
            variant={route === item.id ? "secondary" : "ghost"}
            onClick={() => onRouteChange(item.id)}
          >
            <item.icon className="size-4" aria-hidden="true" />
            <span className="grid gap-0.5">
              <span>{item.label}</span>
              <span aria-hidden="true" className="text-xs font-normal text-muted-foreground">
                {state.reason ?? item.description}
              </span>
            </span>
          </Button>
        );
      })}
    </nav>
  );
}

function MobileNavigation({
  onLogout,
  onOpenPrivacy,
  route,
  session,
  onRouteChange,
}: {
  onLogout: () => void;
  onOpenPrivacy: () => void;
  route: AppRoute;
  session: SessionContextResponse;
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
          <div className="grid min-h-full content-between gap-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">Menu do Validade Zero</p>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Fechar navegacao"
                  onClick={() => setOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <ShellNavigation
                route={route}
                session={session}
                onRouteChange={(nextRoute) => {
                  onRouteChange(nextRoute);
                  setOpen(false);
                }}
              />
            </div>
            <div className="grid gap-2 border-t pt-4">
              <Button
                className="justify-start"
                variant="ghost"
                onClick={() => {
                  onOpenPrivacy();
                  setOpen(false);
                }}
              >
                Privacidade
              </Button>
              <Button
                className="justify-start"
                variant="outline"
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
              >
                Sair da conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function navItemState(route: AppRoute, session: SessionContextResponse): NavItemState {
  if (commandCenterRoutes.has(route)) {
    return session.actions.canReadCommandCenter
      ? { allowed: true }
      : { allowed: false, reason: "Escopo operacional indisponivel" };
  }

  if (route === "controle-gpp") {
    return canOpenGpp(session)
      ? { allowed: true }
      : { allowed: false, reason: "Controle GPP indisponivel" };
  }

  if (route === "access") {
    return session.actions.canManageUsers
      ? { allowed: true }
      : { allowed: false, reason: "Administracao apenas" };
  }

  return session.actions.canReadStoreAudit
    ? { allowed: true }
    : { allowed: false, reason: "Lideranca apenas" };
}

function roleLabel(role: SessionContextResponse["activeRole"]): string {
  if (role === "admin") return "Administracao";
  if (role === "lead") return "Lideranca";
  if (role === "gpp") return "GPP";
  return "Colaborador";
}

function visibleNavItems(session: SessionContextResponse): typeof navItems {
  return navItems.filter((item) => item.id !== "controle-gpp" || canOpenGpp(session));
}

function canOpenGpp(session: SessionContextResponse): boolean {
  return session.featureFlags.controle_gpp_enabled && session.actions.canReadGppQueue;
}
