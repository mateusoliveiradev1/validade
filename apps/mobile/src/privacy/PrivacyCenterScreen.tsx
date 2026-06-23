import { useState } from "react";
import type { PrivacyRequest } from "@validade-zero/contracts";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { captureColors, captureSpacing } from "../capture/capture-theme";
import { Field, PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "../capture/capture-ui";

const sections = [
  ["Politica de Privacidade", "Explica como o piloto usa dados para operar com seguranca e responder a direitos."],
  ["Termos de Uso", "Define o uso responsavel do aplicativo durante a operacao da loja piloto."],
  ["Seguranca da conta", "Sua senha, sessao e vinculo de loja protegem o acesso as tarefas operacionais."],
  ["Permissoes do aparelho", "Camera, notificacoes e evidencias explicam a finalidade, o impacto da recusa e o caminho manual quando existir."],
  ["Dados usados pelo app", "Identidade, loja, papel, acoes fisicas, lotes, tarefas, evidencias, horarios, auditoria e sincronizacao."],
  ["Canal/encarregado", "Use a lideranca ou administracao da loja como canal inicial para duvidas e solicitacoes de dados."],
  ["Solicitacao de direitos LGPD", "Peca acesso, correcao, exclusao, portabilidade ou informacoes sobre o tratamento dos seus dados."],
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
  const contactError = contact.trim().length === 0 ? "Informe um canal para responder ao pedido." : undefined;
  const bodyError = body.trim().length < 20 ? "Descreva o pedido com pelo menos 20 caracteres." : undefined;

  async function submit(): Promise<void> {
    if (contactError !== undefined || bodyError !== undefined) {
      setFeedback("Informe um canal de resposta e descreva seu pedido com pelo menos 20 caracteres.");
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
      setFeedback("Nao foi possivel enviar a solicitacao agora. Confira a sessao e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Centro de Privacidade"
        body="Veja quais dados o app usa para operar com seguranca, registrar evidencias e proteger a area de venda."
      />
      {sections.map(([title, detail]) => (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionBody}>{detail}</Text>
        </View>
      ))}
      <View style={styles.request}>
        <Text style={styles.sectionTitle}>Enviar solicitacao de direitos LGPD</Text>
        {feedback === undefined ? null : <StatusNotice>{feedback}</StatusNotice>}
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
          label={submitting ? "Enviando solicitacao de direitos..." : "Enviar solicitacao de direitos LGPD"}
          onPress={() => void submit()}
          disabled={submitting}
        />
      </View>
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
  section: {
    gap: captureSpacing.small,
  },
  sectionTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  sectionBody: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  request: {
    backgroundColor: captureColors.surfaceMuted,
    borderRadius: 8,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
});
