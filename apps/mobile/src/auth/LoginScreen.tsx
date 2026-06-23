import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { captureColors, captureSpacing } from "../capture/capture-theme";
import { Field, PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "../capture/capture-ui";

export function LoginScreen({
  error,
  onLogin,
  onFirstAccess,
  onRecovery,
  onOpenPrivacy,
}: {
  error?: string;
  onLogin: (input: { identifier: string; password: string }) => Promise<void>;
  onFirstAccess: () => void;
  onRecovery: () => void;
  onOpenPrivacy: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const identifierError = identifier.trim().length === 0 ? "Informe seu identificador de acesso." : undefined;
  const passwordError = password.length === 0 ? "Informe sua senha." : undefined;

  async function submit(): Promise<void> {
    setAttempted(true);
    if (identifierError !== undefined || passwordError !== undefined) return;
    setSubmitting(true);
    await onLogin({ identifier: identifier.trim(), password }).finally(() => setSubmitting(false));
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Entrar no Validade Zero"
        body="Use o acesso criado pela lideranca da loja piloto."
      />
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      <Field
        label="Identificador de acesso"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="E-mail ou identificador"
        error={attempted ? identifierError : undefined}
        editable={!submitting}
      />
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder="Sua senha"
        error={attempted ? passwordError : undefined}
        secureTextEntry
        editable={!submitting}
      />
      <PrimaryAction
        label={submitting ? "Entrando no Validade Zero..." : "Entrar no Validade Zero"}
        onPress={() => void submit()}
        disabled={submitting}
      />
      <SecondaryAction label="Ativar conta por convite" onPress={onFirstAccess} disabled={submitting} />
      <SecondaryAction label="Recuperar acesso da conta" onPress={onRecovery} disabled={submitting} />
      <SecondaryAction label="Abrir Centro de Privacidade" onPress={onOpenPrivacy} disabled={submitting} />
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
