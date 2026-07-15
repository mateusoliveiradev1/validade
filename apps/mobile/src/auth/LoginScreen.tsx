import { useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import brandLogo from "../../assets/brand-horizontal.png";
import { captureColors, captureSpacing } from "../capture/capture-theme";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  ScreenSection,
  SecondaryAction,
  StatusNotice,
} from "../capture/capture-ui";

export function LoginScreen({
  error,
  localTestHint,
  onLogin,
  onFirstAccess,
  onRecovery,
  onOpenPrivacy,
}: {
  error?: string;
  localTestHint?: string | undefined;
  onLogin: (input: { identifier: string; password: string }) => Promise<void>;
  onFirstAccess: () => void;
  onRecovery: () => void;
  onOpenPrivacy: () => void;
}) {
  const passwordRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const localTestPassword = "senha-piloto-forte-123";
  const identifierError =
    identifier.trim().length === 0 ? "Informe seu identificador de acesso." : undefined;
  const passwordError = password.length === 0 ? "Informe sua senha." : undefined;

  async function submit(): Promise<void> {
    setAttempted(true);
    if (identifierError !== undefined || passwordError !== undefined) return;
    setSubmitting(true);
    await onLogin({ identifier: identifier.trim(), password }).finally(() => setSubmitting(false));
  }

  function useLocalAccount(nextIdentifier: string): void {
    setIdentifier(nextIdentifier);
    setPassword(localTestPassword);
    setAttempted(false);
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

      <ScreenSection>
        <ScreenHeader
          title="Entrar"
          body="Acesso operacional da loja piloto. Pendencias continuam visiveis neste aparelho ate sincronizar."
        />

        {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}

        {localTestHint === undefined ? null : (
          <View style={styles.uatBlock}>
            <StatusNotice tone="neutral" title="Ambiente local de UAT">
              {localTestHint}
            </StatusNotice>
            <View style={styles.localTestActions}>
              <View style={styles.localTestAction}>
                <SecondaryAction
                  label="Usar conta Setor"
                  accessibilityLabel="Usar conta Setor"
                  onPress={() => useLocalAccount("setor@example.invalid")}
                />
              </View>
              <View style={styles.localTestAction}>
                <SecondaryAction
                  label="Usar conta GPP"
                  accessibilityLabel="Usar conta GPP"
                  onPress={() => useLocalAccount("gpp@example.invalid")}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.formStack}>
          <Field
            label="Identificador de acesso"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="E-mail ou identificador"
            error={attempted ? identifierError : undefined}
            editable={!submitting}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Field
            inputRef={passwordRef}
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            error={attempted ? passwordError : undefined}
            secureTextEntry
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        </View>

        <PrimaryAction
          label={submitting ? "Entrando..." : "Entrar no Validade Zero"}
          onPress={() => void submit()}
          disabled={submitting}
        />

        <View style={styles.supportActions}>
          <SecondaryAction
            label="Abrir Centro de Privacidade"
            accessibilityLabel="Abrir Centro de Privacidade"
            onPress={onOpenPrivacy}
            disabled={submitting}
          />
          <SecondaryAction
            label="Ativar conta por convite"
            accessibilityLabel="Ativar conta por convite"
            onPress={onFirstAccess}
            disabled={submitting}
          />
          <SecondaryAction
            label="Recuperar acesso da conta"
            accessibilityLabel="Recuperar acesso da conta"
            onPress={onRecovery}
            disabled={submitting}
          />
        </View>
      </ScreenSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    justifyContent: "flex-start",
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge,
    paddingTop: captureSpacing.xlarge,
  },
  brandBlock: {
    alignItems: "center",
    gap: captureSpacing.small,
    paddingTop: captureSpacing.small,
  },
  brandLogo: {
    height: 64,
    maxWidth: 280,
    width: "100%",
  },
  brandLine: {
    color: captureColors.ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
    textAlign: "center",
  },
  uatBlock: {
    gap: captureSpacing.small,
  },
  localTestActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
  },
  localTestAction: {
    flexBasis: 132,
    flexGrow: 1,
  },
  formStack: {
    gap: captureSpacing.medium,
  },
  supportActions: {
    borderTopColor: captureColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
    paddingTop: captureSpacing.medium,
  },
});
