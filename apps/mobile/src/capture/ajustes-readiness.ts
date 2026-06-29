import type { AlertChannelState } from "@validade-zero/domain";
import type { DevicePushRegistrationCommand } from "@validade-zero/contracts";
import { todayCopy } from "./today-copy";

export type AjustesReadinessVerdict = "Apto" | "Atencao" | "Bloqueado";

export interface PushReadiness {
  verdict: AjustesReadinessVerdict;
  body: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
}

export const ajustesPushCopy = {
  title: "Push e lembretes",
  safeBody: "Alertas ajudam a cobrar, mas nao resolvem tarefas nem provam a area de venda.",
  activate: "Ativar alertas do turno",
  testThisDevice: "Enviar teste neste aparelho",
  disableThisDevice: "Desativar neste aparelho",
  localOnlyBody:
    "Lembretes locais do turno ativos neste aparelho. O push remoto ainda precisa do APK aprovado.",
  disabledBody:
    "Este aparelho para de receber lembretes. As tarefas continuam ativas em Hoje e a cobranca pode seguir por outros caminhos.",
  thisDeviceOnly:
    "Teste enviado neste aparelho; prova apenas este aparelho, nao o provedor global nem a area de venda.",
  localUnavailable:
    "Teste local indisponivel neste aparelho. As tarefas continuam ativas em Hoje.",
} as const;

export function pushReadinessFor(input: {
  channelState: AlertChannelState;
  storedPermissionStatus?: DevicePushRegistrationCommand["permissionStatus"] | null | undefined;
  requireRemoteProof?: boolean | undefined;
}): PushReadiness {
  const state = input.storedPermissionStatus ?? input.channelState;
  const blocksRemoteProof =
    input.requireRemoteProof === true &&
    (state === "local_only" || state === "unavailable" || state === "denied");

  if (state === "granted" || state === "active") {
    return {
      verdict: "Apto",
      body: todayCopy.push.active,
      primaryActionLabel: ajustesPushCopy.testThisDevice,
      secondaryActionLabel: ajustesPushCopy.disableThisDevice,
    };
  }

  if (blocksRemoteProof) {
    return {
      verdict: "Bloqueado",
      body: "Este estado bloqueia prova de push remoto ate o APK/provedor estar validado.",
      primaryActionLabel: ajustesPushCopy.testThisDevice,
    };
  }

  if (state === "local_only") {
    return {
      verdict: "Atencao",
      body: ajustesPushCopy.localOnlyBody,
      primaryActionLabel: ajustesPushCopy.testThisDevice,
      secondaryActionLabel: ajustesPushCopy.disableThisDevice,
    };
  }

  if (state === "denied") {
    return {
      verdict: "Atencao",
      body: todayCopy.push.denied,
      primaryActionLabel: todayCopy.push.openSettings,
    };
  }

  if (state === "unavailable" || state === "failed") {
    return {
      verdict: "Atencao",
      body: todayCopy.push.unavailable,
      primaryActionLabel: todayCopy.push.retry,
    };
  }

  return {
    verdict: "Atencao",
    body: ajustesPushCopy.safeBody,
    primaryActionLabel: ajustesPushCopy.activate,
  };
}

export function operatorSafePushFeedback(reason: string | undefined): string {
  if (reason === undefined || reason.trim().length === 0) {
    return todayCopy.push.unavailable;
  }

  const approvedOperationalMessages: readonly string[] = [
    todayCopy.push.active,
    todayCopy.push.denied,
    todayCopy.push.unavailable,
    todayCopy.push.localOnly,
    todayCopy.push.nativeSetupRequired,
    todayCopy.push.failed,
    ajustesPushCopy.disabledBody,
    ajustesPushCopy.thisDeviceOnly,
    ajustesPushCopy.localUnavailable,
  ];

  if (approvedOperationalMessages.includes(reason)) {
    return reason;
  }

  const technicalMarkers = [
    "firebase",
    "fcm",
    "google-services",
    "googleservicesfile",
    "default firebaseapp",
    "expopushtoken",
    "expopushtokenmanager",
    "native push token",
    "provider",
    "token",
    "secret",
    "rawdeviceid",
  ];
  const normalized = reason.toLocaleLowerCase("en-US");

  if (technicalMarkers.some((marker) => normalized.includes(marker))) {
    return todayCopy.push.nativeSetupRequired;
  }

  return todayCopy.push.unavailable;
}
