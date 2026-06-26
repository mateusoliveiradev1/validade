export const PRIVACY_CONTACT_FALLBACK =
  "Use a lideranca ou administracao da loja piloto como canal inicial." as const;

export type PrivacyTopicId =
  | "privacy_policy"
  | "terms_of_use"
  | "account_security"
  | "device_permissions"
  | "operational_data"
  | "privacy_officer";

export interface PrivacyTopicContent {
  id: PrivacyTopicId;
  title: string;
  tag: string;
  summary: string;
  detail: string;
  paragraphs: readonly string[];
}

export interface PrivacyHubSection {
  title: string;
  tag: string;
  summary: string;
  detail: string;
  navigable: boolean;
}

const privacyTopicsSource: readonly PrivacyTopicContent[] = [
  {
    id: "privacy_policy",
    title: "Politica de Privacidade",
    tag: "Dados do piloto",
    summary: "Explica como o piloto usa dados para operar com seguranca e responder a direitos.",
    detail:
      "Nada aqui substitui a confirmacao fisica: os dados servem para registrar a rotina e manter riscos visiveis.",
    paragraphs: [
      "O Validade Zero no piloto usa dados operacionais para registrar evidencias, orientar tarefas e manter a area de venda segura.",
      "Nao coletamos dados de venda, estoque interno ou previsoes comerciais. O foco e o que foi observado e confirmado na loja piloto.",
      "Identidade, loja, papel, acoes fisicas, lotes, tarefas, evidencias, horarios, auditoria e sincronizacao sao tratados apenas para operar o piloto e responder solicitacoes de direitos.",
      "As informacoes ficam vinculadas a conta e a loja autorizada. Quando o acesso deixa de ser valido, a organizacao deve revisar vinculos e retencao conforme sua politica interna.",
      "Voce pode pedir acesso, correcao, exclusao, portabilidade ou informacoes sobre o tratamento pelo formulario LGPD deste centro ou pelo canal da loja.",
    ],
  },
  {
    id: "terms_of_use",
    title: "Termos de Uso",
    tag: "Uso responsavel",
    summary: "Define o uso responsavel do aplicativo durante a operacao da loja piloto.",
    detail:
      "O app apoia a conferencia da loja; ele nao deve ser usado para mascarar pendencias ou criar confirmacoes sem execucao.",
    paragraphs: [
      "O aplicativo apoia a rotina de hortifruti durante o piloto fechado. Ele nao substitui a conferencia fisica nem autoriza declarar area segura sem execucao real.",
      "Cada confirmacao deve refletir uma acao observada na loja. Nao use o app para encerrar tarefas, evidencias ou fechamentos sem fazer o trabalho correspondente.",
      "Credenciais, convites e sessoes sao pessoais. Nao compartilhe senha, token ou acesso com outras pessoas fora do papel autorizado.",
      "Fotos, links de evidencia e dados operacionais nao devem ser copiados para canais pessoais, grupos abertos ou repositorios publicos.",
      "A lideranca da loja piloto pode revogar acesso, revisar pendencias e encerrar o piloto quando necessario para proteger clientes e operacao.",
    ],
  },
  {
    id: "account_security",
    title: "Seguranca da conta",
    tag: "Acesso",
    summary: "Senha, sessao e vinculo de loja protegem o acesso as tarefas operacionais.",
    detail:
      "Cada sessao fica vinculada ao papel autorizado para aquela loja, com revogacao quando o acesso deixa de ser valido.",
    paragraphs: [
      "Seu acesso combina identificador, senha e vinculo ativo com uma loja e um papel operacional.",
      "A sessao expira apos inatividade ou revogacao. Quando isso acontece, entre novamente para continuar; acoes salvas localmente permanecem pendentes de sincronizacao.",
      "Convites de primeiro acesso sao de uso unico e devem ser ativados apenas pela pessoa autorizada pela lideranca.",
      "Se suspeitar de uso indevido, avise a lideranca imediatamente e saia da conta neste aparelho.",
      "Recuperacao de acesso segue o fluxo interno da loja; o app nao revela se um identificador existe para proteger contas.",
    ],
  },
  {
    id: "device_permissions",
    title: "Permissoes do aparelho",
    tag: "Celular da operacao",
    summary:
      "Camera, notificacoes e evidencias explicam finalidade, impacto da recusa e caminho manual quando existir.",
    detail:
      "Quando uma permissao falha, o fluxo precisa oferecer alternativa clara em vez de bloquear a rotina silenciosamente.",
    paragraphs: [
      "Camera: usada para ler codigos de barras e registrar evidencias fotograficas quando o fluxo exige comprovacao visual.",
      "Notificacoes: usadas para alertar sobre tarefas criticas e cobrancas operacionais. Sem elas, voce ainda ve pendencias dentro do app, mas pode perder avisos imediatos.",
      "Se recusar camera, caminhos manuais de digitacao ou registro alternativo aparecem quando existirem no fluxo.",
      "Se recusar notificacoes, continue revisando a fila Hoje com frequencia; alertas fortes no aparelho ficam limitados.",
      "Voce pode revisar permissoes nas configuracoes do Android a qualquer momento.",
    ],
  },
  {
    id: "operational_data",
    title: "Dados usados pelo app",
    tag: "Registro operacional",
    summary:
      "Identidade, loja, papel, acoes fisicas, lotes, tarefas, evidencias, horarios, auditoria e sincronizacao.",
    detail:
      "O foco e rastrear o que foi observado e confirmado na area de venda; vendas e estoque interno nao fazem parte do piloto.",
    paragraphs: [
      "Identidade e papel: nome exibido, e-mail ou identificador operacional e funcao ativa na loja.",
      "Loja e escopo: qual unidade piloto voce opera e quais permissoes estao ativas.",
      "Lotes e tarefas: produto, validade, localizacao, responsavel, estado da pendencia e resolucao exigida.",
      "Evidencias: metadados de foto, motivo operacional e confirmacao de envio; arquivos ficam em armazenamento privado, nao dentro do texto do app.",
      "Auditoria e sincronizacao: horarios, historico de acoes, conflitos de sync e estado offline para manter rastreabilidade do piloto.",
    ],
  },
  {
    id: "privacy_officer",
    title: "Canal/encarregado",
    tag: "Atendimento",
    summary:
      "Use a lideranca ou administracao da loja como canal inicial para duvidas e solicitacoes de dados.",
    detail:
      "A lideranca da loja encaminha pedidos e orienta o operador sem expor segredos, tokens ou evidencias fora do fluxo.",
    paragraphs: [
      "Para duvidas sobre privacidade, retencao ou exercicio de direitos, comece pela lideranca ou administracao da loja piloto.",
      "Canal configurado para este piloto: {{contact}}",
      "Nao envie senhas, tokens, fotos de clientes ou evidencias completas por e-mail ou mensagem pessoal.",
      "Pedidos formais tambem podem ser registrados pelo formulario LGPD deste centro, com um canal de retorno valido.",
      "A organizacao responde conforme prazos e procedimentos internos, sem expor dados de terceiros ou segredos operacionais.",
    ],
  },
] as const;

export const privacyTopics: readonly PrivacyTopicContent[] = privacyTopicsSource;

export const privacyTopicsById: Readonly<Record<PrivacyTopicId, PrivacyTopicContent>> =
  Object.fromEntries(privacyTopicsSource.map((topic) => [topic.id, topic])) as Readonly<
    Record<PrivacyTopicId, PrivacyTopicContent>
  >;

export const privacyLgpdHubSection: PrivacyHubSection = {
  title: "Solicitacao de direitos LGPD",
  tag: "Direitos",
  summary:
    "Peca acesso, correcao, exclusao, portabilidade ou informacoes sobre o tratamento dos seus dados.",
  detail:
    "A solicitacao deve conter contato e contexto suficiente para resposta, sem anexar fotos ou dados sensiveis desnecessarios.",
  navigable: false,
};

export function resolvePrivacyContact(configuredContact?: string | null): string {
  const trimmed = configuredContact?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : PRIVACY_CONTACT_FALLBACK;
}

export function privacyTopicParagraphs(
  topic: PrivacyTopicContent,
  configuredContact?: string | null,
): readonly string[] {
  if (topic.id !== "privacy_officer") return topic.paragraphs;
  const contact = resolvePrivacyContact(configuredContact);
  return topic.paragraphs.map((paragraph) => paragraph.replace("{{contact}}", contact));
}
