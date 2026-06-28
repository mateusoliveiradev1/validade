# Phase 11: Mobile Visual Polish and Emulator Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-27T21:41:56-03:00
**Phase:** 11-mobile-visual-polish-and-emulator-validation
**Areas discussed:** Telas que precisam parecer finais, Linguagem visual de risco e confianca, Criterio de validacao Android, Limite entre passou e bloqueado externo

---

## Telas que precisam parecer finais

| Question | Option | Description | Selected |
|---|---|---|---|
| Escopo obrigatorio do polish visual mobile | Fluxo critico completo | Preparar turno, Hoje, produto, lote, baixa terminal, sync/conflito e fechamento | yes |
| Escopo obrigatorio do polish visual mobile | So entrada operacional | Focar Preparar turno + Hoje + acoes principais | no |
| Escopo obrigatorio do polish visual mobile | Tudo que o usuario toca no Android | Incluir login, privacidade, permissoes, push, produto, lote, tarefas, sync, evidencia e fechamento | no |
| Padrao minimo para parecer final | Pronta para corredor | Legivel em Android, acao primaria clara, estados criticos inequivocos, espacamento consistente, sem aparencia de prototipo | yes |
| Padrao minimo para parecer final | Pronta para release visual | Inclui screenshots antes/depois, revisao de contraste/copy e nenhum componente desalinhado | no |
| Padrao minimo para parecer final | So sem blockers graves | Corrigir apenas problemas visiveis obvios ou que quebram confianca | no |
| Permissao para alterar layout | Pode reorganizar dentro do fluxo existente | Mexer em hierarquia, agrupamento, cards/linhas e ritmo visual sem mudar verdade operacional | yes |
| Permissao para alterar layout | So tokens e componentes | Melhorar botoes, avisos, espacamento, cores e tipografia sem reestruturar telas | no |
| Permissao para alterar layout | Recomposicao mais forte | Redesenhar telas quando a experiencia pedir | no |
| Superficies proibidas de ficar meio polidas | Estados sensiveis | Bloqueio de preparo, risco critico, pendente central, conflito, baixa terminal e fechamento inseguro | yes |
| Superficies proibidas de ficar meio polidas | Telas de cadastro | Busca de produto, rascunho, lote e formularios | no |
| Superficies proibidas de ficar meio polidas | Apenas Hoje e fechamento | Foco somente nas duas superficies de confianca do turno | no |

**User's choice:** Fluxo critico completo; pronta para corredor; reorganizacao dentro do fluxo existente; estados sensiveis nao podem ficar fracos.
**Notes:** The user chose to move to the next area after these decisions.

---

## Linguagem visual de risco e confianca

| Question | Option | Description | Selected |
|---|---|---|---|
| Diferenciar estados criticos | Hierarquia por severidade + texto explicito | Conflito/bloqueio no topo, pendente central perto do veredito, risco critico controlado, texto dizendo o que falta | yes |
| Diferenciar estados criticos | Cores semanticas mais fortes | Usar mais vermelho/amarelo/verde para leitura rapida | no |
| Diferenciar estados criticos | Visual mais calmo | Reduzir superficies criticas e confiar em texto/ordem visual | no |
| Tratamento do verde/acento | Verde so para acao primaria e seguranca comprovada | Reservar para CTA, foco/selecao e estados realmente comprovados | yes |
| Tratamento do verde/acento | Verde tambem para progresso positivo | Usar verde em preparado, sincronizado e caminho correto | no |
| Tratamento do verde/acento | Reduzir bastante o verde | Quase so botao principal | no |
| Tratamento de Pendente central e Local | Aviso persistente, mas nao destrutivo | Superficie warning, texto/icone claro, perto da acao/veredito | yes |
| Tratamento de Pendente central e Local | Quase tao forte quanto conflito | Destacar muito para evitar falsa seguranca | no |
| Tratamento de Pendente central e Local | Discreto na linha do item | Mostrar como status secundario | no |
| Padrao compartilhado | Sim, status system compartilhado | Padronizar StatusNotice, linhas de tarefa/status, badges textuais e estados de sync | yes |
| Padrao compartilhado | So ajustar cada tela | Melhorar localmente sem criar/padronizar componentes | no |
| Padrao compartilhado | Criar so tokens novos | Expandir tokens mantendo componentes como estao | no |

**User's choice:** Shared status system with severity hierarchy, explicit text, restricted green/accent use, and persistent non-destructive treatment for `Local` and `Pendente central`.
**Notes:** The user chose to move to the next area after these decisions.

---

## Criterio de validacao Android

| Question | Option | Description | Selected |
|---|---|---|---|
| Minimo para Android validado | Emulador instalado + Maestro + screenshots | App rodando em emulador/device, `pnpm test:e2e:mobile` passando, screenshots sanitizados e smoke/UAT registrado | yes |
| Minimo para Android validado | So Maestro passando | Fechar Android quando o comando passar | no |
| Minimo para Android validado | APK interno em device fisico | Exigir aparelho fisico pilot-safe | no |
| Fluxos na evidencia | Fluxo critico operacional | Login/privacidade, Preparar turno, Hoje, produto, lote, baixa/pendente central, conflito/sync quando fixture permitir, fechamento | yes |
| Fluxos na evidencia | Fluxo v1-readiness atual | Login, convite/recuperacao e Centro de Privacidade | no |
| Fluxos na evidencia | Fluxo visual por telas | Screenshots das telas principais sem jornada real | no |
| Screenshots no repo publico | Sanitizadas e pequenas | Fixtures ficticias, sem dados reais/tokens/URLs privadas; nomes claros em docs/UAT ou artefato controlado | yes |
| Screenshots no repo publico | So descrever, sem imagens | Evitar qualquer screenshot no repo | no |
| Screenshots no repo publico | Screenshots completas de UAT real | Registrar visualmente staging real | no |
| Fechamento sem emulador/device | Nao fecha; registra bloqueado | Documenta comando/saida e nao declara Android validado | yes |
| Fechamento sem emulador/device | Fecha com testes de componente | Aceitar Vitest mobile e `pnpm check` sem emulador | no |
| Fechamento sem emulador/device | Fecha parcialmente | Polish passa, validacao Android vira follow-up | no |

**User's choice:** Android validation requires emulator/device evidence, passing Maestro, sanitized screenshots, and UAT of the critical operational flow. Without emulator/device, the gate is blocked.
**Notes:** The user chose to move to the next area after these decisions.

---

## Limite entre passou e bloqueado externo

| Question | Option | Description | Selected |
|---|---|---|---|
| Push real Android como obrigacao | Provider real pode ficar bloqueado externo | UX/erro de push and status are in scope; real delivery depends on controlled native APK and provider credentials | yes |
| Push real Android como obrigacao | Sim, push real obrigatorio | Phase closes only with provider configured and reminder delivered/opened on Android | no |
| Push real Android como obrigacao | Nao entra na fase | Ignore real push and focus only on polish/emulator | no |
| Camera/evidencia real | Camera pode ficar como gate externo documentado | Validate UX, permission, no-photo fallback and evidence states; real device only passes with approved device | yes |
| Camera/evidencia real | Camera real obrigatoria | Phase closes only with capture on physical Android | no |
| Camera/evidencia real | Fora da fase | Do not treat camera/evidence in this round | no |
| Docs antigos com Android PASS | Atualizar para matriz de verdade atual | Separate old evidence, current evidence, repo green, emulator green and provider/device blocked | yes |
| Docs antigos com Android PASS | Manter historico como esta | Create only new UAT artifact | no |
| Docs antigos com Android PASS | So anotar conflito | Add warning that Phase 10 supersedes old status | no |
| Status final aceitavel | Polish + emulador podem fechar; provider/device real separado | Phase closes with polish, repo gates, Maestro/emulator and screenshots; push/camera/device may remain explicit external blockers | yes |
| Status final aceitavel | Tudo ou nada | Require polish, emulator, real push, real camera and physical device | no |
| Status final aceitavel | So polish fecha | Android/provider become future tasks, not phase gates | no |

**User's choice:** Provider push and real camera/device proof can remain external documented blockers. Phase 11 closes with mobile polish, repo gates, Maestro/emulator, screenshots, and explicit UAT evidence.
**Notes:** User clarified that real Android push works only with the native APK generated for the approved `@liiiraak1ng/validade-zero` EAS/Expo project with correct Android package and Firebase/FCM credentials; Expo Go or a local/no-Firebase build does not prove real remote push.

---

## the agent's Discretion

- Exact component names and token names.
- Exact screenshot/UAT artifact paths.
- Exact plan count and task grouping.
- Exact Maestro fixture implementation, as long as the critical-flow validation target is preserved.

## Deferred Ideas

None. External provider/device gates remain in scope as explicit pass/block records, not as hidden follow-up success.
