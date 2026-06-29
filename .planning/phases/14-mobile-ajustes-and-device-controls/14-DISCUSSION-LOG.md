# Phase 14: Mobile Ajustes and Device Controls - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-28T23:58:32.8427366-03:00
**Phase:** 14-Mobile Ajustes and Device Controls
**Areas discussed:** Entrada e navegacao de Ajustes, Push, lembretes e teste seguro, Sync, conflitos e bloqueio de fechamento, Build/update, conta, privacidade e saida

---

## Entrada e navegacao de Ajustes

| Option | Description | Selected |
|--------|-------------|----------|
| Botao fixo na barra de sessao | Fica junto de loja/papel/sessao; caminho direto para conta, loja, privacidade e saida. | yes |
| Acao secundaria dentro de Hoje | Da visibilidade, mas aumenta ruido na tela operacional principal. | |
| Menu compacto no topo | Mais limpo, mas menos explicito para operador novo. | |

**User's choice:** Botao fixo na barra de sessao.
**Notes:** Ajustes deve ficar junto da identidade autenticada, nao como mais uma acao dentro de Hoje.

| Option | Description | Selected |
|--------|-------------|----------|
| Voltar exatamente de onde parou | Preserva tarefa, lote, fechamento ou Hoje. | yes |
| Sempre voltar para Hoje | Simples, mas pode interromper trabalho em andamento. | |
| Bloquear Ajustes durante acoes criticas | Evita distracao, mas pode impedir resolver sync/push/conta no momento necessario. | |

**User's choice:** Voltar exatamente de onde parou.
**Notes:** Ajustes nao deve quebrar a pilha operacional.

| Option | Description | Selected |
|--------|-------------|----------|
| Resumo de prontidao do aparelho | Conta/loja no topo e cartoes para push, sync, build/update e privacidade. | yes |
| Lista simples de secoes | Limpa, mas exige abrir secao por secao para entender bloqueios. | |
| Conta e loja primeiro | Forte para seguranca, fraca para diagnostico rapido. | |

**User's choice:** Resumo de prontidao do aparelho.
**Notes:** A primeira pergunta de Ajustes e se este aparelho esta pronto para operar.

| Option | Description | Selected |
|--------|-------------|----------|
| Tela operacional calma, mesma linguagem de Hoje | Reusa componentes e copy operacional existentes. | yes |
| Painel mais diagnostico | Ajuda debug, mas assusta operador de corredor. | |
| Experiencia quase de perfil/conta | Boa para sessao, fraca para sync/build/push. | |

**User's choice:** Tela operacional calma, mesma linguagem de Hoje.
**Notes:** Ajustes deve parecer parte do produto operacional, nao tela tecnica.

---

## Push, lembretes e teste seguro

| Option | Description | Selected |
|--------|-------------|----------|
| Ver estado + ativar/desativar + testar com aviso seguro | Mostra permissao, modo remoto/local, ultimo teste seguro e controles, sem tratar push como execucao. | yes |
| So diagnosticar e ativar | Mais simples, mas deixa teste seguro para web/Aparelhos. | |
| Controle completo por tarefa | Poderoso, mas vira nova capacidade e mistura execucao com configuracao. | |

**User's choice:** Ver estado + ativar/desativar + testar com aviso seguro.
**Notes:** Push em Ajustes precisa ser controle de aparelho, nao resolucao de tarefa.

| Option | Description | Selected |
|--------|-------------|----------|
| Desativar so neste aparelho | O aparelho para de receber lembretes, mas tarefas seguem ativas em Hoje. | yes |
| Desativar por sessao/usuario | Mais amplo, mas arriscado para RBAC e cobranca. | |
| Nao permitir desativar, so abrir configuracoes do sistema | Seguro contra erro, mas ruim para teste/aparelho quebrado. | |

**User's choice:** Desativar so neste aparelho.
**Notes:** Desativar alerta nao apaga cobranca operacional.

| Option | Description | Selected |
|--------|-------------|----------|
| Provar apenas o caminho deste aparelho | Permissao, token/local reminder e abertura quando possivel. | yes |
| Provar provider remoto quando possivel | Util, mas confunde com prova web/global. | |
| So simular lembrete local | Seguro, mas fraco para diagnostico de APK pronto. | |

**User's choice:** Provar apenas o caminho deste aparelho.
**Notes:** Provider global e execucao fisica continuam fora dessa prova.

| Option | Description | Selected |
|--------|-------------|----------|
| Atencao, salvo etapa que exige push remoto | Degradacao nao bloqueia operacao normal, mas bloqueia validacao de push remoto. | yes |
| Sempre bloqueio forte | Pode impedir operacao mesmo com Hoje e sync funcionando. | |
| Sempre informativo | Pode esconder que prova remota falta. | |

**User's choice:** Atencao, salvo etapa que exige push remoto.
**Notes:** Peso do push depende do que esta sendo provado.

---

## Sync, conflitos e bloqueio de fechamento

| Option | Description | Selected |
|--------|-------------|----------|
| Resumo operacional com bloqueio explicito | Ultima leitura central, ultima sync, fila, conflitos e se bloqueia fechamento. | yes |
| Fila detalhada primeiro | Ajuda debug, mas pesa Ajustes. | |
| So estado geral | Simples, mas fraco para explicar bloqueio. | |

**User's choice:** Resumo operacional com bloqueio explicito.
**Notes:** Ajustes deve explicar prontidao antes de listar tudo.

| Option | Description | Selected |
|--------|-------------|----------|
| Ajustes mostra e resolve conflitos | Casa de retry, revisar conflito e descarte com motivo. | yes |
| Ajustes apenas mostra, resolucao continua em Hoje | Espalha diagnostico e solucao em duas telas. | |
| Ajustes so encaminha para a tarefa afetada | Bom para contexto unico, pior para fila com varios comandos. | |

**User's choice:** Ajustes mostra e resolve conflitos.
**Notes:** Reusar as regras de conflito ja existentes no mobile.

| Option | Description | Selected |
|--------|-------------|----------|
| Separar claramente os dois conceitos | Leitura central baixa verdade da loja; sync envia acoes locais. | yes |
| Agrupar como conexao com a central | Simples, mas apaga diferenca critica. | |
| Mostrar so quando houver problema | Reduz ruido, mas dificulta entender bloqueios. | |

**User's choice:** Separar claramente os dois conceitos.
**Notes:** Uma leitura central nao substitui sync, e sync nao substitui leitura central.

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear por conflito critico, acao critica pendente ou leitura central ausente/stale | Evita falso fechamento seguro. | yes |
| Bloquear qualquer pendencia de sync | Conservador, mas pode travar pendencias nao criticas. | |
| Bloquear so conflitos, nao pendencias | Menos friccao, mas arrisca retirada critica pendente. | |

**User's choice:** Bloquear por conflito critico, acao critica pendente ou leitura central ausente/stale.
**Notes:** Fechamento seguro depende de prova central suficiente.

---

## Build/update, conta, privacidade e saida

| Option | Description | Selected |
|--------|-------------|----------|
| Cartao de versao instalada versus aprovada | Versao/build, APK aprovado, compatibilidade, ambiente, API alvo, pacote e proximo passo manual. | yes |
| So status resumido de atualizacao | Limpo, mas fraco para provar APK local e API alvo. | |
| Detalhes tecnicos completos | Ajuda debug, mas aumenta risco de tela tecnica e vazamento. | |

**User's choice:** Cartao de versao instalada versus aprovada.
**Notes:** Verdade de APK local precisa ser explicita.

| Option | Description | Selected |
|--------|-------------|----------|
| Somente leitura com proximo passo claro | Pessoa, loja ativa, papel, conta e sessao; orienta lideranca/admin se estiver errado. | yes |
| Permitir trocar loja ativa | Util, mas vira capacidade propria e mexe com RBAC/sessao. | |
| Mostrar so nome da loja e sair | Simples, mas fraco para diagnostico. | |

**User's choice:** Somente leitura com proximo passo claro.
**Notes:** Sem troca manual de loja na Phase 14.

| Option | Description | Selected |
|--------|-------------|----------|
| Atalho para Centro de Privacidade + resumo do que o app usa | Explica operacao, evidencia, sync, permissoes, build/aparelho e auditoria. | yes |
| So link para Centro de Privacidade | Simples, mas perde contexto operacional. | |
| Privacidade completa dentro de Ajustes | Completo, mas duplica tela existente. | |

**User's choice:** Atalho para Centro de Privacidade + resumo do que o app usa.
**Notes:** Reaproveitar o Centro de Privacidade existente.

| Option | Description | Selected |
|--------|-------------|----------|
| Sair com confirmacao e aviso de pendencias locais | Avisa comandos/conflitos; sair so encerra sessao. | yes |
| Sair direto | Simples, mas perigoso com offline pendente. | |
| Bloquear saida enquanto houver pendencia | Seguro, mas pode prender operador em aparelho compartilhado. | |

**User's choice:** Sair com confirmacao e aviso de pendencias locais.
**Notes:** Sair nao apaga pendencias nem resolve tarefas.

---

## the agent's Discretion

- Component boundaries and route ownership can be chosen during planning.
- Healthy-state card ordering can be refined during UI planning as long as readiness summary remains first.
- Existing push/sync/build pieces may be extracted from TodayScreen or wrapped by shared components as fits the codebase.

## Deferred Ideas

None.
