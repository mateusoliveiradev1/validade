import { useState } from "react";
import {
  InviteMutationResponseSchema,
  type AuthorizationRole,
  type InviteMutationResponse,
} from "@validade-zero/contracts";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { inviteCreateErrorMessage } from "./invite-errors";
import {
  defaultInviteExpiryLocal,
  inviteExpiryBoundsLocal,
  parseInviteExpiryLocal,
  validateInviteExpiryLocal,
} from "./invite-expiry";

type CreatedInvite = InviteMutationResponse & {
  displayName: string;
  identifier: string;
  additionalRoles: readonly AuthorizationRole[];
  issuerLabel: string;
  role: AuthorizationRole;
  storeId: string;
  storeName: string;
};

export function InviteAdministration({
  issuerLabel,
  onOpenActivation,
  onInviteCreated,
  storeId,
  storeName,
}: {
  issuerLabel: string;
  onOpenActivation?: ((token: string) => void) | undefined;
  onInviteCreated: () => void;
  storeId: string;
  storeName: string;
}) {
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AuthorizationRole>("collaborator");
  const [grantAccessAdministration, setGrantAccessAdministration] = useState(false);
  const [expiresAt, setExpiresAt] = useState(defaultInviteExpiryLocal);
  const expiryBounds = inviteExpiryBoundsLocal();
  const [invite, setInvite] = useState<CreatedInvite>();
  const [message, setMessage] = useState<string>();
  const [copyMessage, setCopyMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  async function createInvite(mode: "create" | "resend"): Promise<void> {
    setSubmitting(true);
    setMessage(undefined);
    try {
      const expiryError = validateInviteExpiryLocal(expiresAt);
      if (expiryError !== undefined) {
        setMessage(expiryError);
        return;
      }
      const parsedExpiry = parseInviteExpiryLocal(expiresAt);
      if (parsedExpiry === undefined) {
        setMessage("Escolha uma data e hora validas para o convite.");
        return;
      }
      const additionalRoles = inviteAdditionalRoles(role, grantAccessAdministration);
      const response = await fetch("/auth/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier,
          displayName,
          role,
          ...(additionalRoles.length === 0 ? {} : { additionalRoles }),
          storeId,
          storeName,
          expiresAt: parsedExpiry.toISOString(),
          idempotencyKey: `invite:${mode}:${storeId}:${Date.now()}:${identifier}`,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(inviteCreateErrorMessage(payload, response.status));
      const receipt = InviteMutationResponseSchema.parse(payload);
      setInvite({
        ...receipt,
        identifier,
        displayName,
        additionalRoles,
        role,
        storeId,
        storeName,
        issuerLabel,
      });
      setCopyMessage(undefined);
      setMessage(
        receipt.replayed
          ? "O convite existente foi recuperado. Gere outro se o token precisar ser reenviado."
          : "Convite criado para ativacao fechada da conta.",
      );
      onInviteCreated();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nao foi possivel criar o convite agora.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeInvite(): Promise<void> {
    if (invite === undefined) return;
    setSubmitting(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/auth/invites/${encodeURIComponent(invite.inviteId)}/revoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeId: invite.storeId,
          idempotencyKey: `invite:revoke:${invite.inviteId}:${Date.now()}`,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error("Nao foi possivel revogar o convite agora.");
      const receipt = InviteMutationResponseSchema.parse(payload);
      setInvite({ ...invite, ...receipt });
      setConfirmingRevoke(false);
      setMessage("Convite revogado. Esta conta nao podera ser ativada por este token.");
      onInviteCreated();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nao foi possivel revogar o convite agora.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canCreate =
    identifier.trim().length > 0 && displayName.trim().length > 0 && expiresAt.trim().length > 0;
  const activationUrl = invite?.token === undefined ? undefined : createActivationUrl(invite.token);

  async function copy(value: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copiado.`);
    } catch {
      setCopyMessage(`Nao foi possivel copiar automaticamente. Selecione e copie o ${label}.`);
    }
  }

  function openActivation(token: string, url: string): void {
    if (onOpenActivation !== undefined) {
      onOpenActivation(token);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      className="grid gap-5 rounded-xl border border-border bg-card p-5 shadow-[0_1px_0_color-mix(in_oklch,var(--foreground),transparent_92%)]"
      aria-labelledby="invite-administration-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 id="invite-administration-title" className="text-xl font-semibold leading-6">
            Convites de acesso fechado
          </h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            Nao existe cadastro publico. Crie um convite para uma pessoa da loja; o link abre o
            primeiro acesso ja com o codigo preenchido.
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Sem cadastro publico
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          Identificador de acesso
          <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Nome exibido
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Papel no primeiro acesso
          <Select
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value as AuthorizationRole;
              setRole(nextRole);
              if (nextRole === "admin") setGrantAccessAdministration(false);
            }}
          >
            <option value="collaborator">Colaborador</option>
            <option value="lead">Lideranca</option>
            <option value="admin">Administracao</option>
          </Select>
          {role === "admin" ? null : (
            <label className="mt-2 flex items-start gap-2 text-sm font-normal text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={grantAccessAdministration}
                onChange={(event) => setGrantAccessAdministration(event.target.checked)}
              />
              <span>Tambem pode administrar convites e vinculos desta loja</span>
            </label>
          )}
        </label>
        <div className="grid gap-1">
          <label htmlFor="invite-expiry" className="text-sm font-semibold">
            Expira em
          </label>
          <Input
            id="invite-expiry"
            type="datetime-local"
            aria-describedby="invite-expiry-help"
            min={expiryBounds.min}
            max={expiryBounds.max}
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <span id="invite-expiry-help" className="text-xs font-normal text-muted-foreground">
            Validade do link e do token do convite para o primeiro acesso. Maximo de 30 dias.
          </span>
        </div>
      </div>
      <p className="text-sm leading-5 text-muted-foreground">
        Loja vinculada: {storeName}. Emissor: {issuerLabel}.
      </p>
      <Button
        className="min-h-12 w-fit"
        disabled={!canCreate || submitting}
        onClick={() => void createInvite("create")}
      >
        Criar convite de acesso
      </Button>

      {invite === undefined ? null : (
        <section
          className="grid gap-4 rounded-xl border border-primary/20 bg-accent/70 p-4"
          aria-label="Convite criado"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <h3 className="text-base font-semibold">{invite.displayName}</h3>
              <p className="text-sm text-muted-foreground">
                {invite.identifier} - {roleSummary(invite)} - {invite.storeName}
              </p>
              <p className="text-sm text-muted-foreground">
                Expira em {formatDateTime(invite.expiresAt)}.
              </p>
            </div>
            <span
              className={
                invite.status === "revoked" ? "text-sm text-destructive" : "text-sm text-primary"
              }
            >
              {invite.status === "revoked" ? "Convite revogado" : "Aguardando primeiro acesso"}
            </span>
          </div>
          {invite.status === "revoked" ? (
            <p className="text-sm text-muted-foreground">
              O token foi invalidado e nao fica mais disponivel nesta tela.
            </p>
          ) : invite.token === undefined ? (
            <p className="text-sm text-warning-foreground">
              O token nao esta mais disponivel nesta sessao. Crie um novo convite para reenviar.
            </p>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Token do convite
                <Input aria-label="Token do convite" readOnly value={invite.token} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Link de ativacao
                <Input
                  aria-label="Link de ativacao do convite"
                  readOnly
                  value={activationUrl ?? ""}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copy(invite.token!, "token")}
                >
                  Copiar token
                </Button>
                {activationUrl === undefined ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copy(activationUrl, "link")}
                  >
                    Copiar link
                  </Button>
                )}
                {activationUrl === undefined ? null : (
                  <Button
                    type="button"
                    onClick={() => openActivation(invite.token!, activationUrl)}
                  >
                    Abrir ativacao preenchida
                  </Button>
                )}
              </div>
              {copyMessage === undefined ? null : (
                <p role="status" className="text-sm text-foreground">
                  {copyMessage}
                </p>
              )}
            </div>
          )}
          {invite.status === "revoked" ? null : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void createInvite("resend")}
              >
                Gerar novo convite para reenviar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => setConfirmingRevoke(true)}
              >
                Revogar convite
              </Button>
            </div>
          )}
        </section>
      )}

      {confirmingRevoke && invite !== undefined ? (
        <AlertDialog>
          <AlertDialogTitle>Revogar convite de acesso</AlertDialogTitle>
          <AlertDialogDescription>
            {invite.displayName} nao podera ativar a conta de {roleSummary(invite)} em{" "}
            {invite.storeName} com este token. O convite expira em{" "}
            {formatDateTime(invite.expiresAt)} e foi emitido por {invite.issuerLabel}.
          </AlertDialogDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={submitting}
              onClick={() => void revokeInvite()}
            >
              Confirmar revogacao do convite
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setConfirmingRevoke(false)}
            >
              Manter convite ativo
            </Button>
          </div>
        </AlertDialog>
      ) : null}
      {message === undefined ? null : (
        <p role="status" className="text-sm text-foreground">
          {message}
        </p>
      )}
    </section>
  );
}

function createActivationUrl(token: string): string {
  if (typeof window === "undefined") return `/?invite=${encodeURIComponent(token)}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("invite", token);
  return url.toString();
}

function roleLabel(role: AuthorizationRole): string {
  if (role === "admin") return "Administracao";
  if (role === "lead") return "Lideranca";
  return "Colaborador";
}

function roleSummary(invite: Pick<CreatedInvite, "role" | "additionalRoles">): string {
  const roles = [invite.role, ...invite.additionalRoles];
  return roles.map(roleLabel).join(" + ");
}

function inviteAdditionalRoles(
  role: AuthorizationRole,
  grantAccessAdministration: boolean,
): readonly AuthorizationRole[] {
  if (!grantAccessAdministration || role === "admin") return [];
  return ["admin"];
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
