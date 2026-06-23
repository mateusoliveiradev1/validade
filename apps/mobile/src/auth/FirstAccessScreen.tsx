import { useState } from "react";
import type { InviteValidationResponse } from "@validade-zero/contracts";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { captureColors, captureSpacing } from "../capture/capture-theme";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  StatusNotice,
} from "../capture/capture-ui";
import { MobileAuthError } from "./auth-errors";

export function FirstAccessScreen({
  onActivate,
  onBack,
  onValidateInvite,
}: {
  onActivate: (input: { token: string; password: string }) => Promise<void>;
  onBack: () => void;
  onValidateInvite: (token: string) => Promise<InviteValidationResponse>;
}) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState<InviteValidationResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const tokenError = token.trim().length === 0 ? "Informe o codigo do convite." : undefined;
  const passwordError =
    password.length < 10 ? "Crie uma senha com pelo menos 10 caracteres." : undefined;

  async function validate(): Promise<void> {
    if (token.trim().length < 32) {
      setError("Cole o convite completo recebido da lideranca.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onValidateInvite(token.trim());
      setInvite(result);
      setError(
        result.status === "valid"
          ? undefined
          : "Convite invalido ou expirado. Peca um novo convite a lideranca.",
      );
    } catch {
      setError("Nao foi possivel validar o convite agora. Confira a conexao e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function activate(): Promise<void> {
    if (invite?.status !== "valid") {
      setError("Valide o convite antes de ativar a conta.");
      return;
    }
    if (passwordError !== undefined) {
      setError(passwordError);
      return;
    }
    setSubmitting(true);
    try {
      await onActivate({ token: token.trim(), password });
    } catch (reason) {
      setError(
        reason instanceof MobileAuthError && reason.code === "invalid_invite"
          ? "Convite invalido ou expirado. Peca um novo convite a lideranca."
          : "Nao foi possivel ativar a conta agora. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Ativar conta da loja piloto"
        body="Confirme o convite antes de criar sua senha de acesso."
      />
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      <Field
        label="Codigo do convite"
        value={token}
        onChangeText={setToken}
        placeholder="Cole o codigo recebido"
        error={error === undefined ? undefined : tokenError}
        editable={!submitting}
      />
      <PrimaryAction
        label={submitting ? "Validando convite..." : "Validar convite da conta"}
        onPress={() => void validate()}
        disabled={submitting}
      />
      {invite?.status !== "valid" || invite.invite === undefined ? null : (
        <View style={styles.inviteSummary}>
          <Text style={styles.inviteTitle}>Conta vinculada a esta operacao</Text>
          <Text style={styles.inviteCopy}>
            {invite.invite.storeName} - {invite.invite.role}
          </Text>
          <Field
            label="Crie sua senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimo de 10 caracteres"
            error={error === undefined ? undefined : passwordError}
            secureTextEntry
            editable={!submitting}
          />
          <PrimaryAction
            label={submitting ? "Ativando conta..." : "Ativar conta"}
            onPress={() => void activate()}
            disabled={submitting}
          />
        </View>
      )}
      <SecondaryAction label="Voltar para entrar" onPress={onBack} disabled={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  inviteSummary: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  inviteTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  inviteCopy: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
