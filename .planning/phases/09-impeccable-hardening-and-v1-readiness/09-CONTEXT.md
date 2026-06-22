# Phase 9: Impeccable Hardening and v1 Readiness - Context

**Gathered:** 2026-06-22T19:14:41.6116588-03:00
**Status:** Ready for UI contract and planning

<domain>
## Phase Boundary

Esta fase transforma o Validade Zero em um produto real completo para piloto operacional fechado. Ela nao e uma passada cosmetica nem uma checklist tecnica: a v1 so fecha quando mobile Android, web admin, auth, privacidade, identidade visual, copy, acessibilidade, E2E, seguranca, performance, APK e criterios de release parecerem e funcionarem como produto final.

O foco e uma loja piloto muito bem acabada. A experiencia deve ter auth real e seguro, convite/admin com primeiro acesso, telas completas de login/cadastro/recuperacao/sessao, Centro de Privacidade com LGPD, identidade forte de "Operacao de risco zero", logo/icon/splash/loading, redesign completo mobile + web, Command Center operacional do piloto, estados vazios/erro/offline robustos e cobertura ponta a ponta das jornadas reais.

A fase nao transforma a v1 em SaaS publico comercial. Billing, planos, pagamento, multiempresa self-service, cadastro publico livre, marketplace, app-store publico como canal principal, suporte comercial completo, analytics avancado de causa raiz e iOS como bloqueador de release ficam fora desta fase.

</domain>

<decisions>
## Implementation Decisions

### Produto real v1
- **D-01:** A Fase 9 deve entregar um produto real completo para piloto operacional fechado, nao uma demo, nao um MVP feio e nao um polish incremental.
- **D-02:** A v1 deve estar pronta para uma loja piloto operar de verdade: uma loja, papeis reais, convites reais, dados operacionais reais da propria loja e fluxos sem mock para parecer pronto.
- **D-03:** "Produto real" nesta fase nao significa SaaS publico comercial completo. O escopo comercial publico pertence a evolucao pos-v1.
- **D-04:** Nenhuma tela principal pode parecer provisoria, generica, desalinhada, sem acabamento ou com copy fraca. Isso bloqueia fechamento da fase.
- **D-05:** A experiencia deve continuar ancorada em "zero vencimento na area de venda"; beleza visual nao pode substituir execucao fisica, tarefa persistente, evidencia, sync e fechamento verdadeiro.

### Auth, cadastro e seguranca da conta
- **D-06:** Auth da v1 deve ser real, funcional e seguro. Login fake, bypass visual ou auth apenas simulada nao sao aceitaveis para fechar a fase.
- **D-07:** O acesso usa convite/admin + primeiro acesso. Uma pessoa autorizada cria ou convida o usuario, e o usuario ativa a conta ja vinculado a loja e papel corretos.
- **D-08:** Cadastro publico livre fica fora da v1. Uma pessoa nao pode criar conta e entrar sozinha em superficie operacional sensivel.
- **D-09:** O fluxo minimo de auth inclui login, primeiro acesso, definicao de senha, recuperacao de acesso, logout claro, sessao expirada, conta bloqueada/revogada, sem permissao e convite invalido.
- **D-10:** O baseline de seguranca de acesso e senha forte + recuperacao + sessao segura. MFA obrigatorio nao bloqueia a v1, mas a arquitetura nao deve impedir sua adicao futura.
- **D-11:** A remocao ou reducao de vinculo deve bloquear capacidades imediatamente no proximo refresh de sessao; o cliente nunca deve confiar em papel informado por ele mesmo.
- **D-12:** A escolha de provider deve ser definida por pesquisa/planejamento, mas precisa ficar atras de um `AuthProvider`/adapter substituivel. Neon Auth pode ser considerado, mas nao pode ficar acoplado de forma irreversivel.

### Privacidade, LGPD e confianca
- **D-13:** Privacidade e LGPD entram como produto, nao como rodape juridico improvisado. As telas precisam ser claras, acessiveis e coerentes com a operacao.
- **D-14:** A v1 inclui Centro de Privacidade completo para piloto: Politica de Privacidade, Termos de Uso, Seguranca da conta, Permissoes do aparelho, Dados usados pelo app, canal/encarregado e solicitacao de direitos LGPD.
- **D-15:** As telas devem explicar que dados sao usados para operacao e seguranca: identidade, loja, papel, acoes fisicas, tarefas, lotes, evidencias, horarios, auditoria, sync e permissoes do aparelho.
- **D-16:** Linguagem de privacidade deve ser direta e humana, em Portugues-BR operacional. Evitar juridiquês longo na jornada principal, mas manter conteudo suficiente para piloto responsavel.
- **D-17:** O app deve tratar permissoes sensiveis, especialmente camera, notificacoes e evidencias, com contexto claro: para que serve, o que acontece se negar e como continuar quando possivel.

### Identidade e experiencia visual
- **D-18:** A identidade visual deve ser forte, memoravel e com presenca. "Simples" nao pode significar minimalismo fraco, tela vazia ou marca generica.
- **D-19:** A direcao visual aprovada e "Operacao de risco zero": um produto com cara de selo/sistema de controle operacional, comunicando validade sob controle, area de venda segura e risco que nao fica invisivel.
- **D-20:** O visual deve ser forte sem virar dashboard SaaS, app bancario, planilha enfeitada, marketing decorativo, gamificacao ou hortifruti generico.
- **D-21:** A fase deve entregar logo, app icon, splash, loading, identidade de produto, sistema visual consistente e componentes alinhados entre mobile e web.
- **D-22:** A paleta e tokens atuais podem ser reaproveitados como base operacional, mas a fase pode redesenhar a composicao visual se isso for necessario para parecer produto final.
- **D-23:** O criterio visual e "parece produto final". Se uma tela principal ainda tiver ar de prototipo, a fase continua aberta.

### Mobile Android piloto
- **D-24:** A v1 mobile mira Android primeiro com APK real instalavel/controlado. Expo Go ou rodar apenas em dev nao satisfaz "produto real".
- **D-25:** A distribuicao da v1 piloto e controlada, sem app-store publica como bloqueador. O APK precisa ter nome, icone, splash, auth, privacidade e fluxo operacional com cara final.
- **D-26:** iOS nao bloqueia a v1. O design e arquitetura podem preparar caminho, mas a entrega final desta fase e Android primeiro.
- **D-27:** O mobile continua sendo a superficie principal do corredor: "Hoje", tarefa, lote, rebaixa, offline/sync, evidencia, fechamento e privacidade precisam ser polidos para uso de uma mao, luz forte e internet instavel.
- **D-28:** O mobile nao pode esconder estados criticos atras de UI bonita. Estados de risco, pendencia, sync, evidencia e fechamento devem seguir sendo textuais, inequívocos e acionaveis.

### Web Command Center
- **D-29:** A web da v1 deve ser um admin/Command Center operacional completo para piloto, nao apenas uma tabela tecnica de auditoria.
- **D-30:** O Command Center deve ajudar lideranca a entender onde a operacao esta travando usando dados que o app ja registra: riscos, tarefas, rebaixa, evidencia, sync, auditoria e fechamento.
- **D-31:** A organizacao aprovada para o painel e funil operacional do risco: primeiro "area de venda segura?", depois lotes criticos, tarefas atrasadas, rebaixas pendentes, evidencias pendentes/falhas, conflitos de sync, fechamentos com pendencias e historico por turno.
- **D-32:** Graficos e metricas sao permitidos e desejados, desde que sejam operacionais e derivados do dominio existente. Nao inventar BI, previsao, dados de vendas ou causa raiz avancada sem base.
- **D-33:** Auditoria e busca por item continuam importantes, mas viram investigacao complementar dentro do Command Center, nao a unica experiencia web.
- **D-34:** O painel admin precisa parecer premium, responsivo e confiavel; estilos inline/provisorios devem ser substituidos por componentes e tokens consistentes.

### Estados completos de produto
- **D-35:** A v1 deve ter estados de produto real em tudo: splash forte, loading de sessao, skeletons, empty states uteis, erros recuperaveis, offline claro, sessao expirada, sem permissao, convite invalido e conta bloqueada.
- **D-36:** Empty states devem orientar a proxima acao, nao dizer apenas "nada aqui".
- **D-37:** Erros de auth, privacidade, permissao, sync, evidencia e API precisam explicar o que aconteceu e como recuperar, sem detalhes tecnicos desnecessarios.
- **D-38:** Loading e skeleton devem preservar confianca: nao piscar, nao bloquear sem mensagem e nao fazer parecer que uma acao fisica foi confirmada antes do ack correto.

### Impeccable e criterio de craft
- **D-39:** Impeccable deve ser usado como processo forte nesta fase: shape -> craft -> critique -> polish -> audit -> harden.
- **D-40:** Visual, UI/UX e copy precisam ser tratados como requisitos de release, nao como acabamento opcional.
- **D-41:** Se o Impeccable apontar problema grave de UI/UX/copy/acessibilidade em tela principal, a fase nao fecha ate corrigir.
- **D-42:** Copy deve ser Portugues-BR operacional, direta, firme e nao culpabilizante. Termos como seguro, pendente, enviado, fechado, sincronizado e confirmado precisam ser semanticamente verdadeiros.
- **D-43:** Acessibilidade minima e WCAG 2.2 AA como referencia: contraste, foco visivel, rotulos acessiveis, alvos grandes, estados nao dependentes so de cor e suporte a movimento reduzido.

### E2E, seguranca, performance e release
- **D-44:** E2E obrigatorio cobre jornadas reais ponta a ponta: login/primeiro acesso, convite, privacidade, sessao/sem permissao, Hoje, cadastro de lote, risco critico, rebaixa, offline/sync, evidencia, fechamento, admin/convites e Command Center.
- **D-45:** Release gate e rigido. A fase so fecha se auth, privacidade, UI/UX/copy, acessibilidade, E2E, seguranca, performance, APK e web passarem sem bloqueadores.
- **D-46:** Security checks devem cobrir public-repo hygiene, segredos, autorizacao por papel/loja, sessoes, convites, privacidade, upload/evidencia, auditabilidade e rotas web/API.
- **D-47:** Performance precisa ser medida na experiencia real: app abrir, sessao resolver, Hoje carregar, Command Center carregar, filtros responderem, sync/erro nao travarem o fluxo.
- **D-48:** Se qualquer gate tiver gap que afete seguranca, privacidade, confianca visual, fluxo principal ou afirmacao de area segura, o gap bloqueia release em vez de virar risco aceito.

### the agent's Discretion
O planejamento pode definir nomes de telas, composicao exata, grid do Command Center, biblioteca de graficos, mecanismo de asset/logo, provider de auth, formato de convites, copy final de microestados e estrategia de build APK, desde que preserve as decisoes acima. Nenhuma decisao de produto sobre "auth real", "privacidade completa", "visual produto final", "APK Android", "Command Center" ou "release gate rigido" foi delegada ao agente.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo, produto e stack
- `.planning/ROADMAP.md` - define a Fase 9, requisito UI-04, UI hint e criterios de sucesso de Impeccable, E2E, seguranca e release.
- `.planning/REQUIREMENTS.md` - define UI-04 e todo o mapa v1 que a Fase 9 deve endurecer sem reabrir escopo comercial.
- `.planning/PROJECT.md` - define o valor central, restricoes de custo zero, no sales integration, mobile-first, seguranca, confiabilidade e qualidade.
- `AGENTS.md` - consolida as regras obrigatorias do repo, stack, workflow GSD e restricoes de implementacao.
- `.planning/research/STACK.md` - define Expo/React Native, React/Vite, Hono/Cloudflare, Neon, R2, Cron, Expo Push, SQLite/outbox, Zod e adapters substituiveis.
- `PRODUCT.md` - define o registro `product`, usuarios reais, proposito, personalidade, anti-referencias, principios de design e acessibilidade.

### Decisoes anteriores que a Fase 9 nao pode quebrar
- `.planning/phases/08-audit-roles-and-shift-close/08-CONTEXT.md` - define fechamento verdadeiro, RBAC por loja, auditoria append-only, evidencia controlada e seguranca que nao pode ser afirmada com cache/pendencia.
- `.planning/phases/07-offline-sync/07-CONTEXT.md` - define cache offline, comando idempotente, pendencia central, conflitos explicitos e proibicao de confundir acao local com confirmacao.
- `.planning/phases/06-markdown-rebaixa-workflow/06-CONTEXT.md` - define workflow de rebaixa, evidencia de etiqueta/prateleira, responsabilidades e atraso.
- `.planning/phases/05-push-and-escalation/05-CONTEXT.md` - define que push/escalonamento cobra, mas nao resolve nem substitui confirmacao fisica.
- `.planning/phases/04-today-task-workflow/04-CONTEXT.md` - define "Hoje" como fonte operacional, veredito de area segura, tarefas acionaveis e validacao forte de retirada/reconferencia.
- `.planning/phases/03-mobile-lot-capture/03-CONTEXT.md` - define captura mobile, lista recente operacional, observacoes fisicas e timestamp local.

### Mobile atual
- `apps/mobile/app.json` - configura nome, slug, scheme, plugins e pacote Android; precisa ganhar assets reais de icon/splash e perfil de piloto.
- `apps/mobile/App.tsx` - entrada atual do app mobile; ponto para splash/sessao/auth gate e inicializacao visual real.
- `apps/mobile/src/capture/CaptureApp.tsx` - roteamento mobile atual; precisa evoluir de fluxo direto operacional para shell autenticado com estados de sessao e privacidade.
- `apps/mobile/src/capture/TodayScreen.tsx` - superficie principal de "area de venda segura?", tarefas, sync e entrada de fechamento; deve ser polida sem perder prioridade operacional.
- `apps/mobile/src/capture/TaskResolutionPanel.tsx` - fluxo de resolucao fisica, evidencia, rebaixa e auditoria contextual; deve manter verdade semantica de confirmacao.
- `apps/mobile/src/capture/ShiftCloseScreen.tsx` - fechamento de turno; deve integrar auth/papel, copy final, loading/erro/offline e acabamento visual.
- `apps/mobile/src/capture/capture-theme.ts` - tokens mobile atuais; base possivel para redesenho, contraste e identidade forte.
- `apps/mobile/src/capture/capture-ui.tsx` - componentes mobile reutilizaveis; ponto de evolucao para sistema visual completo.
- `apps/mobile/src/capture/today-copy.ts` - copy operacional central; fonte para padronizar linguagem de estados, auth, sync e privacidade.
- `apps/mobile/src/capture/offline-sync-ui.tsx` - padrao existente de estados offline/sync/conflito que a Fase 9 deve polir sem enfraquecer.

### Web atual
- `apps/web/src/App.tsx` - shell web atual; precisa virar produto/admin real em vez de smoke visual.
- `apps/web/src/index.css` - tokens web/shadcn atuais, incluindo cores alinhadas ao mobile e Geist.
- `apps/web/components.json` - shadcn configurado com `radix-nova`, base neutral, menu subtle e lucide; usar como base em vez de reinicializar UI primitives.
- `apps/web/src/auth/CurrentScope.tsx` - estado de escopo atual ainda com estilos inline/provisorios; deve virar componente de produto dentro do shell.
- `apps/web/src/memberships/MembershipAdministration.tsx` - admin de vinculos; base para convite/admin e primeiro acesso.
- `apps/web/src/audit/AuditWorkbench.tsx` - superficie de auditoria atual; deve virar investigacao complementar dentro do Command Center.
- `apps/web/src/audit/EvidenceAccessConfirm.tsx` - confirmacao de acesso a evidencia; relevante para privacidade, auditoria e copy de seguranca.

### Auth, autorizacao, auditoria e docs operacionais
- `apps/api/src/auth.ts` - seam atual de auth/session; ponto de evolucao para auth real com adapter e testes.
- `apps/api/src/authorization.test.ts` - cobertura de autorizacao por papel/loja que deve continuar protegendo a v1.
- `packages/domain/src/authorization.ts` - regras de autorizacao do dominio; base para capacidades reais da sessao.
- `packages/contracts/src/authorization.ts` - contratos de autorizacao; base para cliente/API.
- `docs/operations/audit-and-access.md` - runbook de auditoria, acesso operacional, administracao de vinculos e resposta a incidente.
- `docs/operations/shift-close.md` - runbook de fechamento verdadeiro e politica de migracao Neon descartavel.

### Referencias externas que a pesquisa deve verificar
- `https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1` - referencia oficial da ANPD sobre titular de dados e direitos.
- `https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes` - FAQ oficial da ANPD para fundamentos de papeis, canal e responsabilidades LGPD.
- `https://docs.expo.dev/build/internal-distribution/` - distribuicao interna Expo/EAS para APK Android.
- `https://docs.expo.dev/build-reference/apk/` - diferenca APK/AAB e configuracao de builds instalaveis.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `capture-theme.ts` e `apps/web/src/index.css` ja compartilham uma direcao verde operacional, surfaces claras, critical/warning e contraste forte; podem virar sistema visual mais memoravel em vez de serem descartados.
- `capture-ui.tsx` ja oferece botoes, campos, selecoes e notices com alvos de 48px; a Fase 9 deve evoluir isso para estados completos, foco, loading, disabled, erro e variantes de auth/privacy.
- `TodayScreen.tsx` ja lidera com o veredito da area de venda e integra sync, push, tarefas e fechamento; deve ser o centro do redesign mobile.
- `AuditWorkbench.tsx`, `MembershipAdministration.tsx` e `CurrentScope.tsx` ja fornecem dados e rotas para admin/auditoria, mas precisam ser integrados em um Command Center real.
- `docs/operations/*` ja contem linguagem operacional de acesso, auditoria, evidencia e fechamento; usar esses docs para copy, privacidade e runbooks.
- `app.json` ja possui nome, package Android e plugins Expo; falta identidade de app real, icon/splash e perfil de build/distribuicao.

### Established Patterns
- Mobile e local-first; "Hoje" e a fonte operacional. Redesign nao deve criar um dashboard mobile que esconda a acao de corredor.
- Copy visivel e Portugues-BR operacional; codigo, tipos e enums continuam em ingles tecnico.
- A seguranca depende de papel + loja + confirmacao fisica + ack central quando aplicavel; UI nao pode contradizer isso.
- A web e complementar a lideranca/admin/auditoria; agora deve se tornar Command Center operacional, nao app principal do colaborador.
- O repo evita dados reais, segredos e binarios privados; assets e exemplos devem ser gerados/seguros para repositorio publico.
- `pnpm.cmd check` e a gate local mais confiavel neste Windows/PowerShell.

### Integration Points
- Inserir um auth/session gate antes de `CaptureApp` no mobile e antes do shell web, mantendo capacidades derivadas da API/contratos.
- Expandir `apps/api/src/auth.ts`, contratos e repositorios para convite, primeiro acesso, recuperacao, sessao e revogacao segura.
- Criar o Centro de Privacidade como superficie compartilhada conceitualmente entre mobile e web, com copy e links consistentes.
- Evoluir o web shell para Command Center com metricas a partir de tarefas, riscos, rebaixas, sync, evidencias, auditoria e fechamento existentes.
- Configurar EAS/Android APK, icon, splash e assets de marca sem introduzir segredos ou dependencias pagas.
- Amarrar E2E web/mobile aos fluxos reais de auth, privacidade, tarefa, rebaixa, sync, evidencia, fechamento e admin.

</code_context>

<specifics>
## Specific Ideas

- O app precisa sair da Fase 9 com cara de "produto real 100% em tudo", nao MVP feio.
- A identidade deve ser forte, com presenca e memoravel; evitar "simples" como desculpa para visual fraco.
- Direcao verbal/visual: "Operacao de risco zero", "validade sob controle", "area de venda segura" e "nada vencido fica invisivel".
- Login/cadastro precisam ser "perfeitos", com telas de seguranca e privacidade tambem cuidadas.
- O painel admin precisa ajudar a entender gargalos, riscos e por que a operacao deixa produto chegar perto do vencimento, mas usando dados realmente disponiveis no piloto.
- O web deve ter metricas/graficos, mas o primeiro corte e funil operacional de risco, nao BI preditivo ou comparacao comercial ampla.
- Android piloto deve gerar APK real instalavel, nao depender de Expo Go.
- Gate final: se parecer generico, nao passa.

</specifics>

<deferred>
## Deferred Ideas

- Billing, planos, pagamento e suporte comercial completo ficam fora da Fase 9.
- Cadastro publico livre, multiempresa self-service e marketplace/app-store publico ficam fora da Fase 9.
- Analytics completo de causa raiz, previsoes, comparacoes amplas por fornecedor/loja/categoria e recomendacoes inteligentes ficam para evolucao pos-v1.
- iOS nao bloqueia v1; pode ser preparado, mas Android APK e o alvo piloto.
- Publicacao em Google Play/App Store fica fora da Fase 9, exceto se virar decisao futura explicita.

</deferred>

---

*Phase: 9-Impeccable Hardening and v1 Readiness*
*Context gathered: 2026-06-22T19:14:41.6116588-03:00*
