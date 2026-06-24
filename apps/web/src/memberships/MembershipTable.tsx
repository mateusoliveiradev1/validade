import { useRef, useState } from "react";
import type { AuthorizationRole, ManagedStoreMembership } from "@validade-zero/contracts";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { DropdownMenu } from "../components/ui/dropdown-menu";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";

export function MembershipTable(input: {
  items: readonly ManagedStoreMembership[];
  onChanged: (membership: ManagedStoreMembership) => void;
}) {
  const [pendingRevoke, setPendingRevoke] = useState<ManagedStoreMembership | undefined>();
  const [revokeReason, setRevokeReason] = useState("");
  const revokeTrigger = useRef<HTMLButtonElement>(null);

  async function changeRole(membership: ManagedStoreMembership, role: AuthorizationRole) {
    if (membership.role === role) return;
    const response = await fetch(`/memberships/${membership.membershipId}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storeId: membership.storeId,
        role,
        expectedVersion: membership.version,
        idempotencyKey: `membership-role:${membership.membershipId}:${membership.version}:${role}`,
      }),
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { membership: ManagedStoreMembership };
    input.onChanged(payload.membership);
  }

  async function confirmRevoke() {
    if (pendingRevoke === undefined) return;
    const response = await fetch(`/memberships/${pendingRevoke.membershipId}/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storeId: pendingRevoke.storeId,
        expectedVersion: pendingRevoke.version,
        reason: revokeReason.trim(),
        idempotencyKey: `membership-revoke:${pendingRevoke.membershipId}:${pendingRevoke.version}`,
      }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { membership: ManagedStoreMembership };
      input.onChanged(payload.membership);
    }
    setPendingRevoke(undefined);
    setRevokeReason("");
    revokeTrigger.current?.focus();
  }

  return (
    <section
      aria-labelledby="membership-table-title"
      className="grid gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="membership-table-title" className="m-0 text-lg font-semibold">
            Vinculos por loja
          </h2>
          <p className="m-0 text-sm text-muted-foreground">
            Mudancas ficam auditadas; identidade e unidade nao sao alteradas nesta tela.
          </p>
        </div>
        <Badge>{input.items.length} registro(s)</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="border-y border-l border-border bg-muted px-3 py-2 first:rounded-l-lg">
                Pessoa
              </th>
              <th className="border-y border-border bg-muted px-3 py-2">Papel</th>
              <th className="border-y border-border bg-muted px-3 py-2">Loja</th>
              <th className="border-y border-border bg-muted px-3 py-2">Status</th>
              <th className="border-y border-r border-border bg-muted px-3 py-2 last:rounded-r-lg">
                <span className="sr-only">Acoes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {input.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum vinculo ativo nesta loja ainda. Crie um convite para iniciar o acesso.
                </td>
              </tr>
            ) : null}
            {input.items.map((membership) => (
              <tr key={membership.membershipId} className="align-top">
                <td className="border-b border-border/70 px-3 py-3">
                  <strong className="block break-words">{membership.displayName}</strong>
                  <span className="break-all text-muted-foreground">{membership.subjectId}</span>
                </td>
                <td className="border-b border-border/70 px-3 py-3">
                  <Select
                    aria-label={`Papel de ${membership.displayName}`}
                    value={membership.role}
                    disabled={membership.status !== "active"}
                    onChange={(event) =>
                      void changeRole(membership, event.target.value as AuthorizationRole)
                    }
                  >
                    <option value="collaborator">Colaborador</option>
                    <option value="lead">Lideranca</option>
                    <option value="admin">Administracao</option>
                  </Select>
                </td>
                <td className="border-b border-border/70 px-3 py-3">{membership.storeName}</td>
                <td className="border-b border-border/70 px-3 py-3">
                  <Badge tone={membership.status === "active" ? "success" : "neutral"}>
                    {membership.status === "active" ? "Ativo" : "Revogado"}
                  </Badge>
                </td>
                <td className="border-b border-border/70 px-3 py-3 text-right">
                  <DropdownMenu label="Acoes">
                    <Button
                      ref={revokeTrigger}
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={membership.status !== "active"}
                      onClick={() => {
                        setRevokeReason("");
                        setPendingRevoke(membership);
                      }}
                    >
                      Revogar vinculo
                    </Button>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pendingRevoke === undefined ? null : (
        <AlertDialog>
          <AlertDialogTitle>Revogar vinculo operacional</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingRevoke.displayName} perdera o papel de {pendingRevoke.role} em{" "}
            {pendingRevoke.storeName}. Capacidades atuais deixam de valer no proximo refresh de
            sessao. Esta acao nao encerra nem resolve tarefas abertas.
          </AlertDialogDescription>
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Motivo da revogacao
            <Input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={revokeReason.trim().length === 0}
              onClick={() => void confirmRevoke()}
            >
              Confirmar revogacao
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingRevoke(undefined);
                setRevokeReason("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </AlertDialog>
      )}
    </section>
  );
}
