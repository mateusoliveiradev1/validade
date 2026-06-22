import * as React from "react";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export type EvidenceAccessMode = "same_store" | "admin_exceptional" | "denied";

export function EvidenceAccessConfirm({
  evidenceId,
  evidenceLabel,
  targetStoreId,
  targetStoreName,
  mode,
  onOpenEvidence,
}: {
  evidenceId: string;
  evidenceLabel: string;
  targetStoreId: string;
  targetStoreName: string;
  mode: EvidenceAccessMode;
  onOpenEvidence?:
    | ((input: {
        evidenceId: string;
        confirmedTargetStore: boolean;
        reason?: string | undefined;
      }) => void)
    | undefined;
}) {
  const [reason, setReason] = React.useState("");

  if (mode === "denied") {
    return (
      <AlertDialog className="border-critical-border bg-critical-surface">
        <AlertDialogTitle>Evidência protegida</AlertDialogTitle>
        <AlertDialogDescription>
          Seu acesso não permite abrir este arquivo. Nenhum detalhe de armazenamento foi revelado.
        </AlertDialogDescription>
      </AlertDialog>
    );
  }

  if (mode === "same_store") {
    return (
      <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Evidência privada</h3>
        <p className="text-sm leading-5 text-muted-foreground">
          {evidenceLabel}. A abertura passa pela API autorizada; chave de objeto e URL assinada não
          são exibidas.
        </p>
        <Button
          type="button"
          className="w-fit"
          onClick={() =>
            onOpenEvidence?.({
              evidenceId,
              confirmedTargetStore: false,
            })
          }
        >
          Abrir evidência
        </Button>
      </div>
    );
  }

  const canOpen = reason.trim().length > 0;

  return (
    <AlertDialog>
      <div className="grid gap-3">
        <AlertDialogTitle>Acesso administrativo excepcional</AlertDialogTitle>
        <AlertDialogDescription>
          Esta evidência pertence à loja {targetStoreName} ({targetStoreId}). Confirme antes de
          abrir; o acesso será registrado na auditoria.
        </AlertDialogDescription>
        <label className="grid gap-1 text-sm font-semibold text-foreground">
          Motivo do acesso
          <Input
            value={reason}
            placeholder="Ex.: auditoria de fechamento fictícia"
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <Button
          type="button"
          className="w-fit"
          disabled={!canOpen}
          onClick={() =>
            onOpenEvidence?.({
              evidenceId,
              confirmedTargetStore: true,
              reason: reason.trim(),
            })
          }
        >
          Abrir evidência desta loja
        </Button>
      </div>
    </AlertDialog>
  );
}
