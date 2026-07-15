import { useRef, useState } from "react";
import type { PrivacyRequest } from "@validade-zero/contracts";
import {
  privacyLgpdHubSection,
  privacyTopics,
  privacyTopicsById,
  type PrivacyTopicId,
} from "@validade-zero/contracts";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { captureColors, captureRadii, captureSpacing } from "../capture/capture-theme";
import { Field, PrimaryAction, SecondaryAction, StatusNotice } from "../capture/capture-ui";
import { PrivacyTopicDetailScreen } from "./PrivacyTopicDetailScreen";

function configuredPrivacyContact(): string | undefined {
  const value = (
    process.env as { EXPO_PUBLIC_PRIVACY_CONTACT?: string | undefined }
  ).EXPO_PUBLIC_PRIVACY_CONTACT?.trim();
  return value !== undefined && value.length > 0 ? value : undefined;
}

export function PrivacyCenterScreen({
  activeTopic,
  onSelectTopic,
  onBack,
  onSubmitRightsRequest,
}: {
  activeTopic: PrivacyTopicId | null;
  onSelectTopic: (topicId: PrivacyTopicId | null) => void;
  onBack: () => void;
  onSubmitRightsRequest: (request: PrivacyRequest) => Promise<void>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const privacyContact = configuredPrivacyContact();
  const contactError =
    contact.trim().length === 0 ? "Informe um canal para responder ao pedido." : undefined;
  const bodyError =
    body.trim().length < 20 ? "Descreva o pedido com pelo menos 20 caracteres." : undefined;

  async function submit(): Promise<void> {
    if (contactError !== undefined || bodyError !== undefined) {
      setFeedback(
        "Informe um canal de resposta e descreva seu pedido com pelo menos 20 caracteres.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitRightsRequest({
        requestType: "access",
        contact: { channel: "email", value: contact.trim() },
        dataCategories: [
          "identity",
          "store_and_role",
          "physical_actions",
          "lots_and_tasks",
          "evidence",
          "timestamps_and_audit",
          "sync_state",
          "device_permissions",
        ],
        body: body.trim(),
        idempotencyKey: `privacy-mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      });
      setFeedback("Solicitacao recebida. O canal informado sera usado para o retorno do pedido.");
    } catch {
      setFeedback(
        "Nao foi possivel enviar a solicitacao agora. Confira a sessao e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToRightsForm(): void {
    scrollRef.current?.scrollToEnd({ animated: true });
  }

  if (activeTopic !== null) {
    return (
      <PrivacyTopicDetailScreen
        topic={privacyTopicsById[activeTopic]}
        {...(privacyContact === undefined ? {} : { privacyContact })}
        onBack={() => onSelectTopic(null)}
      />
    );
  }

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.heroSeal}>
          <Text style={styles.heroSealText}>LGPD</Text>
        </View>
        <Text style={styles.heroKicker}>Centro de Privacidade</Text>
        <Text style={styles.heroTitle}>Dados claros para operar sem susto.</Text>
        <Text style={styles.heroBody}>
          O app usa apenas o necessario para registrar evidencias, proteger a area de venda e
          responder solicitacoes do piloto.
        </Text>
        <View style={styles.heroChips}>
          <Text style={styles.heroChip}>Sem dados de venda</Text>
          <Text style={styles.heroChip}>Conta protegida</Text>
          <Text style={styles.heroChip}>Solicitacao de direitos LGPD</Text>
        </View>
        <SecondaryAction label="Voltar ao produto" onPress={onBack} disabled={submitting} />
      </View>

      <View style={styles.sectionList}>
        {privacyTopics.map((topic) => (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${topic.title}`}
            onPress={() => onSelectTopic(topic.id)}
            style={({ pressed }) => [styles.section, pressed ? styles.sectionPressed : undefined]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTag}>{topic.tag}</Text>
                <Text style={styles.sectionTitle}>{topic.title}</Text>
                <Text style={styles.sectionBody}>{topic.summary}</Text>
              </View>
              <Text
                style={styles.sectionChevron}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                ›
              </Text>
            </View>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir para solicitacao de direitos LGPD"
          onPress={scrollToRightsForm}
          style={({ pressed }) => [styles.section, pressed ? styles.sectionPressed : undefined]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTag}>{privacyLgpdHubSection.tag}</Text>
              <Text style={styles.sectionTitle}>{privacyLgpdHubSection.title}</Text>
              <Text style={styles.sectionBody}>{privacyLgpdHubSection.summary}</Text>
            </View>
            <Text
              style={styles.sectionChevron}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              ↓
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.request}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestKicker}>Direitos de dados</Text>
          <Text style={styles.sectionTitle}>Enviar solicitacao LGPD</Text>
          <Text style={styles.sectionBody}>
            Informe um canal de retorno e descreva o pedido. Evite colar senha, foto ou dado
            sensivel no texto.
          </Text>
        </View>
        {feedback === undefined ? null : (
          <StatusNotice tone={feedback.startsWith("Solicitacao recebida") ? "success" : "error"}>
            {feedback}
          </StatusNotice>
        )}
        <Field
          label="Canal para responder ao pedido"
          value={contact}
          onChangeText={setContact}
          placeholder="Seu e-mail"
          error={feedback === undefined ? undefined : contactError}
          editable={!submitting}
        />
        <Field
          label="Descreva seu pedido de direitos"
          value={body}
          onChangeText={setBody}
          placeholder="Exemplo: desejo uma copia dos meus dados operacionais"
          error={feedback === undefined ? undefined : bodyError}
          editable={!submitting}
        />
        <PrimaryAction
          label={
            submitting
              ? "Enviando solicitacao de direitos..."
              : "Enviar solicitacao de direitos LGPD"
          }
          onPress={() => void submit()}
          disabled={submitting}
        />
      </View>
      <SecondaryAction label="Voltar ao produto" onPress={onBack} disabled={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  hero: {
    backgroundColor: captureColors.ink,
    borderRadius: captureRadii.medium,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  heroSeal: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  heroSealText: {
    color: captureColors.onAccent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    lineHeight: 16,
  },
  heroKicker: {
    color: "#BBF7D0",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 18,
  },
  heroTitle: {
    color: captureColors.onAccent,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 33,
  },
  heroBody: {
    color: "#DCFCE7",
    fontSize: 16,
    lineHeight: 23,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
  },
  heroChip: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    color: captureColors.onAccent,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sectionList: {
    gap: captureSpacing.small,
  },
  section: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    padding: captureSpacing.medium,
  },
  sectionPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: captureSpacing.small,
    justifyContent: "space-between",
  },
  sectionCopy: {
    flex: 1,
    gap: 6,
  },
  sectionChevron: {
    color: captureColors.mutedInk,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 2,
  },
  sectionTag: {
    color: captureColors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: captureColors.ink,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
  },
  sectionBody: {
    color: captureColors.mutedInk,
    fontSize: 15,
    lineHeight: 22,
  },
  request: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  requestHeader: {
    gap: 6,
  },
  requestKicker: {
    color: captureColors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: "uppercase",
  },
});
