---
phase: 08
slug: audit-roles-and-shift-close
status: draft
shadcn_initialized: true
preset: b2fA
created: 2026-06-22
surface: mobile-react-native-and-web-react-vite
---

# Phase 08 — UI Design Contract

> Contrato visual e de interação para auditoria, acesso por papel e loja, ciclo de evidências e fechamento de turno. Segurança só pode ser afirmada após confirmação física e validação central; encerrar um turno com pendências não pode parecer uma falha de software nem uma resolução.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | React Native capture theme no mobile; shadcn oficial + Tailwind CSS v4 no web |
| Preset | b2fA — estilo radix-nova, tema/base color neutral, radius default, menu accent subtle |
| Component library | Primitivos React Native e componentes locais no mobile; Radix via shadcn no web |
| Icon library | Lucide no web; no mobile, ícones apenas reforçam rótulos visíveis |
| Font | System sans no mobile; Geist Variable no web |

Fontes: 08-CONTEXT.md D-01–D-24; 08-RESEARCH.md; apps/mobile/src/capture/capture-theme.ts; capture-ui.tsx; TodayScreen.tsx; offline-sync-ui.tsx; apps/web/components.json; npx shadcn info em 2026-06-22.

### Identidade e estratégia visual

- Cena física: a liderança usa o celular com uma mão, sob iluminação forte, no fim do turno e sob pressão para não declarar segurança indevida. Mobile permanece claro, firme, de alto contraste e em coluna única.
- Web é uma mesa de investigação complementar para liderança/admin. Deve ser densa, calma e confiável: lista/tabela, filtros e detalhe; sem cards métricos, gráficos decorativos ou aparência de dashboard SaaS.
- Estratégia de cor: restrained. Verde identifica ação primária, seleção e segurança confirmada; amarelo identifica atenção/pendência; vermelho identifica bloqueio crítico ou ação destrutiva.
- Preservar a identidade de captureColors. Os neutros gerados pelo preset shadcn são infraestrutura, não direção final; mapear os tokens web para a paleta deste contrato antes de implementar a tela de auditoria.
- Não usar dark mode nesta fase. O uso principal acontece em ambiente iluminado; suporte futuro não pode atrasar o fluxo operacional.

### Componentes e responsabilidade

| Superfície | Componentes permitidos/requeridos |
|------------|-----------------------------------|
| Mobile base | ScreenHeader, PrimaryAction, SecondaryAction, Field, SelectionRow, StatusNotice, ConfirmationSheet |
| Mobile novo | ShiftCloseEntry, ShiftCloseReview, BlockingIssueList, PhysicalCloseChecklist, HandoffForm, ShiftCloseReceipt, HandoffReceiptAction, AuditTimeline, EvidenceStatus, EvidenceRetryAction, EvidenceInvalidationPanel |
| Web shell | Button, Input, Select, Popover, Calendar, Sheet, Table, Skeleton, Badge, Separator, AlertDialog, DropdownMenu, Tooltip do registry oficial |
| Web novo | StoreScopeBar, AuditFilterBar, AuditResultsTable, AuditEventDetail, MembershipTable, MembershipEditor, EvidenceAccessConfirm |

Regras:

- Não usar blocks prontos de dashboard. Compor a superfície com componentes oficiais básicos e estrutura própria.
- Não aninhar cards. Uma linha auditável abre um painel de detalhe; o painel não repete cada campo dentro de outro card.
- Ícones Lucide usam traço consistente de 16–20px. Todo ícone de estado vem acompanhado de texto; ações icon-only exigem tooltip, nome acessível e alvo de 44px.
- Modais não conduzem o fechamento. O fechamento é uma tela progressiva; AlertDialog fica restrito a invalidação de evidência, revogação de acesso e reabertura auditada.

---

## Information Architecture And Responsive Contract

### Distribuição entre superfícies

| Capacidade | Mobile | Web |
|------------|--------|-----|
| Fechamento seguro/inseguro | Primária; fluxo completo em Hoje | Somente consulta do recibo e timeline |
| Passagem e confirmação de recebimento | Primária para liderança | Consulta complementar |
| Evidência | Captura, fila, retry e estado; invalidação por liderança | Consulta autorizada, detalhe e invalidação |
| Timeline contextual | Tarefa, lote, evidência e fechamento | Os mesmos alvos em detalhe |
| Auditoria geral | Lista simplificada da própria loja quando necessária | Primária; filtros persistentes e detalhe |
| Papéis e vínculos de loja | Explicação de permissão e identidade atual | Administração de vínculos e papéis |

### Mobile

- Larguras de 320–767px: coluna única, gutter de 16px, conteúdo essencial sem rolagem horizontal.
- Em tablet, limitar o fluxo de fechamento a 640px e mantê-lo alinhado ao início; não transformar checklist ou blockers em grid de cards.
- Ordem do leitor: veredito de segurança → estado de cache/sync → entrada do fechamento → blockers → checklist → decisão → confirmação → recibo.
- A ação fixa inferior só é permitida na etapa final e deve respeitar safe area. O conteúdo nunca fica oculto atrás dela.
- Textos de produto, lote, pessoa, motivo e local quebram linha; não truncar a informação que explica risco ou autoria.

### Web

- Em 1200px ou mais: shell com navegação lateral de 224px, barra de escopo superior e conteúdo fluido. Auditoria usa tabela e painel lateral de detalhe de 440px.
- De 768–1199px: navegação recolhível; tabela preserva Quando, Evento/Alvo, Pessoa e Estado. Loja aparece na barra de escopo; campos secundários migram para o painel de detalhe.
- Abaixo de 768px: resultados viram lista semântica; filtros abrem em Sheet; o detalhe ocupa a viewport. Não comprimir uma tabela desktop horizontal.
- Conteúdo principal usa largura máxima de 1440px. Texto explicativo limita-se a 72ch; dados tabulares podem usar a largura total.
- Barra de escopo da loja permanece visível durante filtro e rolagem. Admin global precisa escolher uma loja ou Todas as lojas antes de consultar; evidência entre lojas exige confirmação adicional.

---

## Visual And Interaction Contract

### 1. Entrada e revisão do fechamento

1. Em Hoje, Revisar fechamento do turno aparece após o veredito, cache e sync e antes da lista não crítica. A entrada é visível para liderança.
2. Colaborador não recebe um botão morto de fechamento. Quando o contexto tornar a ação relevante, mostrar aviso neutro: Somente a liderança desta loja pode fechar o turno.
3. O fluxo é uma tela progressiva, não modal: veredito atual → impedimentos → checklist físico → decisão → confirmação → recibo.
4. O topo distingue quatro frases sem ambiguidade:
   - Área segura para fechar — elegível, ainda não encerrado.
   - Não é possível confirmar área segura — existem blockers.
   - Turno encerrado com área segura — recibo central confirmado.
   - Turno encerrado com pendências — encerrado, cobrança continua.
5. Área segura para fechar usa estrutura positiva, ícone rotulado e superfície accentSoft; nunca apenas texto verde.
6. Turno encerrado com pendências usa warning surface, lista de continuidade e responsável; não usar título Erro, botão vermelho ou ícone de falha.

### 2. Blockers e checklist

- Blockers são lista ordenada por gravidade, não contadores soltos: risco vencido/crítico, reconferência aberta, conflito crítico, sync crítico pendente, cache desatualizado, evidência obrigatória pendente e checklist incompleto.
- Cada item mostra: descrição operacional, item/lote/local quando aplicável, por que impede segurança e ação direta (Abrir tarefa, Revisar conflito, Sincronizar agora, Atualizar tarefas).
- Checklist fixo e nesta ordem:
  1. Conferi riscos vencidos e críticos na área de venda
  2. Conferi reconferências abertas
  3. Conferi rebaixas aplicadas na área de venda
- Cada linha de checklist tem alvo mínimo de 48dp, estado marcado textual e caixa nativa/familiar. Não marcar automaticamente a partir de dados do sistema.
- Checklist incompleto impede somente o selo seguro; o turno ainda pode ser encerrado com pendências e passagem obrigatória.

### 3. Decisão e validação

- Quando elegível, a ação primária é Encerrar turno com área segura. Antes do commit, mostrar estado inline Validando com o sistema… e desabilitar apenas a ação final.
- Falha ou ausência de conexão nunca mantém a ação segura habilitada. Mostrar Não foi possível validar a segurança agora. e oferecer Encerrar turno com pendências com passagem obrigatória.
- Quando há blockers, Encerrar turno com pendências é a ação principal do fluxo, com tratamento warning, não destructive.
- Fechamento inseguro exige motivo, responsável, prazo e observação antes de habilitar a confirmação. Responsável e prazo ficam visíveis no resumo final.
- A confirmação repete veredito, loja, horário, checklist, quantidade de pendências e responsável. A ação de retorno é Voltar e revisar.
- Toques duplicados não criam recibos duplicados; durante envio, manter o resumo visível e trocar somente a ação por estado de progresso.

### 4. Recibo, passagem e reabertura

- Recibo seguro mostra loja, turno, liderança, horário realizado, horário recebido pelo sistema, versão da regra e checklist confirmado.
- Recibo inseguro mantém pendências expandidas com motivo, responsável, prazo e status de recebimento.
- Confirmar recebimento da passagem cria um evento independente. Após confirmar, mostrar Passagem recebida; nunca Pendências resolvidas.
- Fechamento salvo offline mostra Fechamento salvo neste aparelho e Pendente de sincronização. Não usar Turno confirmado antes do ack.
- Reabertura fica na tela de detalhe, exige motivo e mostra: O registro original será preservado. Uma nova revisão será criada.
- A revisão nova referencia a anterior em uma sequência legível (Fechamento original → Reaberto → Nova revisão) sem permitir edição inline do histórico.

### 5. Evidências

| Estado | Rótulo | Tratamento | Ação |
|--------|--------|------------|------|
| waiting_upload | Aguardando envio | warning surface + texto | Nenhuma, ou Enviar agora quando houver rede |
| uploading | Enviando evidência | neutro + progresso não bloqueante | Desabilitar retry duplicado |
| uploaded | Evidência enviada | accent soft + horário central | Ver evidência se autorizado |
| failed | Falha no envio | critical surface + explicação | Tentar enviar novamente |
| invalidated | Evidência invalidada | critical text + motivo/autoria | Ver histórico e Substituir evidência |
| expired | Arquivo expirado | muted surface | Ver registro preservado |

- O estado aparece junto do alvo operacional e na timeline; nunca como pequeno ponto colorido.
- URI local, object key, URL assinada, hash completo e payload não aparecem na UI comum.
- Evidência invalidada permanece no histórico, mas deixa de ser exibida como prova atual. Mostrar motivo, quem invalidou, quando e evidência substituta quando existir.
- Admin atravessando lojas vê Você está abrindo uma evidência da loja {loja} e confirma Abrir evidência desta loja; essa consulta gera auditoria.
- Loading de imagem preserva metadados e skeleton do frame. Falha de preview não muda o estado central de uploaded.

### 6. Timeline contextual

- Timeline usa linguagem operacional em ordem cronológica reversa. Cada item mostra ação, alvo, pessoa, papel no momento da ação, loja, motivo/resumo e evidência relacionada.
- Eventos locais pendentes aparecem acima do último evento central relacionado, com status explícito.
- Para evento offline, mostrar duas linhas:
  - Realizada no aparelho às {hora}
  - Recebida pelo sistema às {hora} ou Ainda não recebida pelo sistema
- Correção, invalidação e reabertura aparecem como novo item vinculado ao fato anterior. Nunca substituir o item original.
- IDs, payloads, headers, dispositivo e metadados técnicos ficam em seção Diagnóstico colapsada e somente para papel autorizado.
- A abertura comum de tela, filtro ou linha não cria decoração de timeline nem mensagem de auditoria.

### 7. Auditoria geral no web

- Barra superior: escopo da loja, período e ação Limpar filtros. Segunda linha: pessoa, tipo de evento e item afetado.
- Filtros aplicados ficam persistentes na URL ou estado restaurável; não criar chips coloridos para cada filtro.
- Tabela desktop:
  - Quando: data/hora realizada; indicador secundário se recebida depois.
  - Evento e alvo: frase operacional + produto/lote/tarefa/fechamento.
  - Pessoa: nome + papel snapshot.
  - Loja: obrigatória em escopo global.
  - Estado: somente pendente, conflito, negado, invalidado ou recebido quando relevante.
- Clique ou Enter na linha abre AuditEventDetail em painel lateral. A linha mantém foco visível ao fechar.
- Paginação por cursor usa Carregar mais eventos; não mostrar número total fictício.
- Skeleton preserva cabeçalho, filtros e seis linhas. Erro mantém filtros e último resultado válido quando disponível.
- Não usar cards de total de eventos, produtividade, ranking, comparação entre lojas ou gráficos nesta fase.

### 8. Papéis e vínculos de loja

- Administração web usa tabela simples por pessoa: nome, papel, loja, status e última alteração auditada.
- Editor mostra identidade como somente leitura. Papel e loja são seleções explícitas; o resumo final descreve a capacidade concedida.
- A combinação admin não concede operação local. Quando não existe vínculo de liderança, mostrar Administração não autoriza fechamento operacional nesta loja.
- Revogar vínculo exige confirmação com pessoa + loja. Alterar papel de liderança para colaborador mostra impacto antes de confirmar.
- Superfícies fora do papel ficam ocultas. Ação relevante porém não autorizada usa estado bloqueado neutro com explicação e caminho de contato; não simular erro técnico.
- Tentativa negada por escopo mostra Você não tem acesso a este item nesta loja. sem revelar existência, detalhes ou IDs do recurso.

---

## Spacing Scale

Valores declarados para toda UI nova da Fase 8:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Ícone-rótulo, helper e metadado relacionado |
| sm | 8px | Controles compactos, linhas de estado e células |
| md | 16px | Gutter mobile, padding de linha, campos empilhados |
| lg | 24px | Separação de seções, grupos de filtro e blockers |
| xl | 32px | Cabeçalho de tela e respiro de recibo |
| 2xl | 48px | Alvo mobile e zona de ação primária |
| 3xl | 64px | Quebra rara entre etapas de página |

Exceções:

- Componentes mobile existentes podem conservar captureSpacing.medium de 12px; componentes novos não criam novos valores fora da escala.
- Controles web têm mínimo de 40px; ações icon-only têm 44×44px; ambos são múltiplos de 4 e não viram novos tokens de layout.
- Alvos mobile, checklist, retry, recebimento e fechamento têm no mínimo 48×48dp.

Radii:

- Mobile: 6px em controles, 8px em superfícies.
- Web: token shadcn base de 10px; limitar cards/painéis a 10px e pills somente a tags de estado.
- Sem bordas laterais coloridas, sombras largas ou card com borda + sombra decorativa.

---

## Typography

Usar exatamente quatro tamanhos e dois pesos na UI nova.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / metadata | 14px | 400 ou 600 | 20px |
| Body / control | 16px | 400 ou 600 | 24px |
| Heading / panel title | 20px | 600 | 24px |
| Display / safety verdict | 28px | 600 | 34px |

Regras:

- Peso 600 apenas para títulos, ação primária, estado que precisa ser escaneado e seleção atual. Corpo e explicações usam 400.
- Mobile usa fonte do sistema; web usa Geist Variable. Não misturar fontes nem usar display font.
- Frases de auditoria e motivos limitam-se a 72ch quando não são tabulares.
- Sem uppercase rastreado, títulos fluidos, kicker decorativo ou IDs técnicos como texto primário.
- Cópia visível usa português-BR correto. Código, enums e contratos permanecem em inglês técnico.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F7F9F6 | Fundo de página e canvas operacional |
| Secondary (30%) | #FFFFFF | Tabela, painel de detalhe, formulários, recibos e linhas principais |
| Accent (10%) | #166534 | Ação primária segura, seleção atual, foco e confirmação central |
| Destructive | #A1271D | Invalidar evidência, revogar acesso e bloqueio crítico |

Accent reserved for: Encerrar turno com área segura, Revisar fechamento do turno, ação primária do filtro quando necessária, seleção atual, foco visível, link ativo e confirmação central recebida. Não aplicar verde a toda ação ou a toda evidência enviada.

### Semânticos de suporte

| Token | Value | Usage |
|-------|-------|-------|
| Ink | #132018 | Texto principal |
| Muted ink | #3E5547 | Texto secundário com contraste AA |
| Muted surface | #EDF3EE | Barra lateral, linha neutra, filtro e estado sem urgência |
| Pressed surface | #E2EBE4 | Press/hover secundário |
| Border | #BAC8BE | Divisores e controles |
| Accent soft | #DDEDE2 | Elegibilidade segura e ack central |
| Critical surface | #FFF0EE | Blocker crítico, falha de upload e confirmação destrutiva |
| Critical border | #E8B5B0 | Limite crítico |
| Warning surface | #FFF7E2 | Fechamento com pendências, upload aguardando, sync pendente |
| Warning border | #E7D39A | Limite de atenção |
| Warning ink | #5D4505 | Texto de atenção |

Todos os pares de texto/fundo devem atingir WCAG 2.2 AA. Estado, permissão, evidência e sync combinam texto + estrutura + ícone opcional; cor nunca é o único sinal.

Mapeamento shadcn obrigatório:

- --background → dominant; --foreground → ink.
- --card/--popover → secondary; --muted/--sidebar → muted surface.
- --primary → accent; --primary-foreground → branco.
- --destructive → destructive; --border/--input → border; --ring → accent.
- Não usar os chart tokens nesta fase.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Revisar fechamento do turno |
| Safe close CTA | Encerrar turno com área segura |
| Unsafe close CTA | Encerrar turno com pendências |
| Safe eligibility heading | Área segura para fechar |
| Blocked heading | Não é possível confirmar área segura |
| Safe receipt | Turno encerrado com área segura |
| Unsafe receipt | Turno encerrado com pendências |
| Offline close feedback | Fechamento salvo neste aparelho. Pendente de sincronização. |
| Revalidation loading | Validando com o sistema… |
| Revalidation error | Não foi possível validar a segurança agora. Confira a conexão ou encerre com pendências e registre a passagem. |
| Handoff CTA | Registrar passagem do turno |
| Handoff acknowledgment | Confirmar recebimento da passagem |
| Handoff acknowledgment feedback | Passagem recebida. As pendências continuam abertas até a resolução física. |
| Evidence retry | Tentar enviar novamente |
| Audit empty heading | Nenhum evento encontrado |
| Audit empty body | Não há eventos para este período e filtros. Ajuste os filtros ou limpe a busca. |
| Audit error state | Não foi possível carregar a auditoria. Seus filtros foram mantidos; tente novamente. |
| Audit pagination | Carregar mais eventos |
| Permission block | Somente a liderança desta loja pode realizar esta ação. |
| Cross-store denial | Você não tem acesso a este item nesta loja. |

### Confirmações sensíveis e destrutivas

| Action | Confirmation copy | Final label |
|--------|-------------------|-------------|
| Invalidar evidência | Esta evidência deixará de valer como prova atual, mas continuará no histórico. Informe o motivo. | Confirmar invalidação |
| Reabrir fechamento | O registro original será preservado. Informe o motivo para criar uma nova revisão. | Reabrir fechamento |
| Revogar vínculo | Revogar o acesso de {pessoa} à loja {loja}? As ações já registradas continuarão na auditoria. | Revogar acesso |
| Fechar com pendências | O turno será encerrado, mas as pendências e cobranças continuarão abertas para {responsável}. | Confirmar turno com pendências |

Regras de voz:

- Frase direta, operacional e não acusatória. Nomear o problema e a próxima ação.
- Não usar OK, Submit, Salvar, Enviar ou Cancelar como decisão principal. Retorno é Voltar e revisar.
- Não usar sucesso para recebimento de passagem ou fechamento inseguro.
- Não expor payload, object key, JWT, IDOR, server, outbox ou URL assinada.
- Realizada no aparelho e Recebida pelo sistema são conceitos distintos em toda cópia.

---

## Accessibility, Motion And Edge States

| State | Required behavior |
|-------|-------------------|
| Loading mobile | Preservar veredito e estrutura; skeleton apenas em blockers/recibo. |
| Loading web | Preservar shell, escopo e filtros; seis skeleton rows. |
| Empty audit | Mostrar heading/body do contrato e Limpar filtros. |
| Stale cache | Impedir selo seguro, explicar atualização e permitir fechamento com pendências. |
| Offline | Manter dados locais, marcar horário realizado e pendência de ack. |
| Critical conflict | Fixar antes do checklist e oferecer Revisar conflito. |
| Upload failed | Preservar a evidência local e oferecer retry direto. |
| Unauthorized | Não revelar recurso; explicar papel/loja sem parecer crash. |
| Long content | Motivo, pessoa, produto, lote e local quebram linha; nenhuma ação essencial fica truncada. |

- WCAG 2.2 AA: contraste 4.5:1 para texto normal, foco visível de 2px equivalente, ordem de teclado/leitor igual à prioridade operacional.
- Web: tabela com cabeçalhos semânticos, linha acionável também por teclado, painel Sheet com foco contido e retorno ao trigger.
- Mobile: anunciar mudança de veredito, ack de fechamento, falha de upload e recebimento de passagem em live region apropriada.
- Movimento dura 150–200ms, ease-out, apenas para seleção, painel, ack e mudança de estado. prefers-reduced-motion ou preferência nativa reduz a instantâneo/crossfade.
- Nenhum conteúdo nasce oculto por animação. Sem bounce, stagger de página ou loading teatral.
- Fixtures, screenshots e testes usam nomes, lojas e evidências fictícias. Nenhum binário privado, token ou dado real entra no repositório.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | button instalado; componentes básicos listados neste contrato aprovados para adição | npx shadcn info confirmou somente @shadcn oficial em 2026-06-22 |
| Third-party registries | none | não aplicável — nenhum registry/bloco terceiro declarado em 2026-06-22 |

- Preset oficial: b2fA, radix-nova, Lucide, Geist, Tailwind CSS v4.
- Não adicionar block de dashboard, pacote visual externo, asset remoto ou registry terceiro sem novo shadcn view, diff e aprovação explícita.
- Componentes oficiais devem ser revisados após geração; remover variantes não utilizadas e adaptar tokens sem alterar semântica/acessibilidade Radix.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
