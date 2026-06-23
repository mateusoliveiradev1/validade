import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { captureColors, captureSpacing } from "../capture/capture-theme";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  StatusNotice,
} from "../capture/capture-ui";
import { MobileAuthError } from "./auth-errors";

export function RecoveryScreen({
  onBack,
  onRequestRecovery,
}: {
  onBack: () => void;
  onRequestRecovery: (identifier: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState("");
  const [feedback, setFeedback] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const identifierError =
    identifier.trim().length === 0
      ? "Informe o e-mail ou identificador usado no convite."
      : undefined;

  async function request(): Promise<void> {
    if (identifierError !== undefined) {
      setFeedback(identifierError);
      return;
    }
    setSubmitting(true);
    try {
      await onRequestRecovery(identifier.trim());
      setFeedback(
        "Se houver uma conta elegivel, a lideranca recebera a proxima etapa de recuperacao.",
      );
    } catch (reason) {
      setFeedback(
        reason instanceof MobileAuthError && reason.code === "network"
          ? "Nao foi possivel solicitar a recuperacao agora. Confira a conexao e tente novamente."
          : "Nao foi possivel solicitar a recuperacao agora.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Recuperar acesso da conta"
        body="Informe seu identificador. Esta tela nao confirma se uma conta existe."
      />
      {feedback === undefined ? null : <StatusNotice>{feedback}</StatusNotice>}
      <Field
        label="E-mail ou identificador do convite"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Seu identificador"
        error={feedback === identifierError ? identifierError : undefined}
        editable={!submitting}
      />
      <PrimaryAction
        label={submitting ? "Solicitando recuperacao..." : "Solicitar recuperacao da conta"}
        onPress={() => void request()}
        disabled={submitting}
      />
      <SecondaryAction label="Voltar para entrar" onPress={onBack} disabled={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    justifyContent: "center",
    padding: captureSpacing.large,
  },
});
