import { useState } from "react";
import type { PrivacyRequest } from "@validade-zero/contracts";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { captureColors, captureRadii, captureSpacing } from "../capture/capture-theme";
import { Field, PrimaryAction, SecondaryAction, StatusNotice } from "../capture/capture-ui";

const sections = [
  {
    title: "Politica de Privacidade",
    tag: "Dados do piloto",
    detail: "Explica como o piloto usa dados para operar com seguranca e responder a direitos.",
  },
  {
    title: "Termos de Uso",
    tag: "Uso responsavel",
    detail: "Define o uso responsavel do aplicativo durante a operacao da loja piloto.",
  },
  {
    title: "Seguranca da conta",
    tag: "Acesso",
    detail: "Senha, sessao e vinculo de loja protegem o acesso as tarefas operacionais.",
  },
  {
    title: "Permissoes do aparelho",
    tag: "Celular da operacao",
    detail:
      "Camera, notificacoes e evidencias explicam finalidade, impacto da recusa e caminho manual quando existir.",
  },
  {
    title: "Dados usados pelo app",
    tag: "Registro operacional",
    detail:
      "Identidade, loja, papel, acoes fisicas, lotes, tarefas, evidencias, horarios, auditoria e sincronizacao.",
  },
  {
    title: "Canal/encarregado",
    tag: "Atendimento",
    detail:
      "Use a lideranca ou administracao da loja como canal inicial para duvidas e solicitacoes de dados.",
  },
  {
    title: "Solicitacao de direitos LGPD",
    tag: "Direitos",
    detail:
      "Peca acesso, correcao, exclusao, portabilidade ou informacoes sobre o tratamento dos seus dados.",
  },
] as const;

export function PrivacyCenterScreen({
  onBack,
  onSubmitRightsRequest,
}: {
  onBack: () => void;
  onSubmitRightsRequest: (request: PrivacyRequest) => Promise<void>;
}) {
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
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

  return (
    <ScrollView contentContainerStyle={styles.screen}>
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
        {sections.map(({ title, tag, detail }) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTag}>{tag}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionBody}>{detail}</Text>
          </View>
        ))}
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
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    lineHeight: 18,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: captureColors.onAccent,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
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
    gap: 6,
    padding: captureSpacing.medium,
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
