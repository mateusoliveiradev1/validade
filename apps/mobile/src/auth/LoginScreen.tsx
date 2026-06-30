import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import brandLogo from "../../assets/brand-horizontal.png";
import { captureColors, captureRadii, captureSpacing } from "../capture/capture-theme";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  StatusNotice,
} from "../capture/capture-ui";

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
  const identifierError =
    identifier.trim().length === 0 ? "Informe seu identificador de acesso." : undefined;
  const passwordError = password.length === 0 ? "Informe sua senha." : undefined;

  async function submit(): Promise<void> {
    setAttempted(true);
    if (identifierError !== undefined || passwordError !== undefined) return;
    setSubmitting(true);
    await onLogin({ identifier: identifier.trim(), password }).finally(() => setSubmitting(false));
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.brandBlock}>
        <Image
          accessibilityLabel="Validade Zero - Operacao de risco zero"
          resizeMode="contain"
          source={brandLogo}
          style={styles.brandLogo}
        />
        <Text style={styles.brandLine}>Nada vencido fica invisivel.</Text>
      </View>

      <View style={styles.loginPanel}>
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
        <SecondaryAction
          label="Abrir Centro de Privacidade"
          onPress={onOpenPrivacy}
          disabled={submitting}
        />
      </View>

      <View style={styles.supportPanel}>
        <Text style={styles.supportTitle}>Primeiro acesso ou suporte</Text>
        <Text style={styles.supportBody}>
          Ative o convite da loja piloto ou recupere seu acesso com a lideranca.
        </Text>
        <View style={styles.supportActions}>
          <View style={styles.supportAction}>
            <SecondaryAction
              label="Ativar conta por convite"
              onPress={onFirstAccess}
              disabled={submitting}
            />
          </View>
          <View style={styles.supportAction}>
            <SecondaryAction
              label="Recuperar acesso da conta"
              onPress={onRecovery}
              disabled={submitting}
            />
          </View>
        </View>
      </View>
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
  brandBlock: {
    alignItems: "center",
    gap: captureSpacing.small,
  },
  brandLogo: {
    height: 90,
    maxWidth: 360,
    width: "100%",
  },
  brandLine: {
    color: captureColors.ink,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    textAlign: "center",
  },
  loginPanel: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  supportPanel: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  supportTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  supportBody: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  supportActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
  },
  supportAction: {
    flexBasis: 131,
    flexGrow: 1,
  },
});
