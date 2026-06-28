# Phase 12: Pilot Operations and Device Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-28T11:09:51.3537834-03:00
**Phase:** 12-pilot-operations-and-device-readiness
**Areas discussed:** Painel de aparelhos prontos, Teste de push seguro, Verdade da build instalada, UAT guiado e bloqueios do piloto

---

## Painel de aparelhos prontos

| Question | Option | Description | Selected |
|---|---|---|---|
| Veredito principal do aparelho | Apto / Atencao / Bloqueado | Resumo forte por aparelho calculado por versao compativel, loja/usuario validos, ultimo sync, push, camera e permissoes. | Yes |
| Veredito principal do aparelho | Checklist aberto por sinal | Mostra todos os campos sem resumir em veredito. | |
| Veredito principal do aparelho | Voce decide | Planner escolhe o modelo exato sem falso apto. | |
| Sinais de bloqueio | Bloqueio so para risco operacional real | Loja/usuario invalido, app muito antigo, sem primeira leitura central, sync critico velho, push impossivel quando o teste exige push, camera negada quando a etapa exige evidencia. | Yes |
| Sinais de bloqueio | Bloqueio para qualquer pendencia | Qualquer aviso vira bloqueio. | |
| Sinais de bloqueio | Voce decide | Planner define a matriz exata. | |
| Identificacao do aparelho | Nome operacional + usuario + loja + versao | Token e IDs tecnicos ficam mascarados ou so em auditoria segura. | Yes |
| Identificacao do aparelho | ID tecnico completo | Mais util para debug, mas ruim para operacao e perigoso para repo publico/capturas. | |
| Identificacao do aparelho | Apenas usuario e loja | Simples, mas fraco para diferenciar dois celulares da mesma pessoa/equipe. | |
| Presenca/status | Ultimo foreground + ultimo sync + ultima leitura central | Mostra se o app foi aberto recentemente, se enviou dados e se recebeu verdade central. | Yes |
| Presenca/status | Somente ultimo sync | Simples, mas pode esconder app instalado que nem foi aberto ou leitura central velha. | |
| Presenca/status | Tempo real/online agora | Exigiria presenca live e pode virar promessa falsa. | |

**User's choice:** `1` for all four questions.
**Notes:** The user accepted the recommended operationally truthful model.

---

## Teste de push seguro

| Question | Option | Description | Selected |
|---|---|---|---|
| Quem pode disparar teste | Lideranca e admin da loja | Lead/admin com vinculo ativo na mesma loja podem testar dispositivos do piloto; colaborador nao dispara teste para evitar ruido. | Yes |
| Quem pode disparar teste | Qualquer pessoa do turno | Mais facil no corredor, mas pode virar barulho e confundir teste com cobranca real. | |
| Quem pode disparar teste | Somente admin | Mais controlado, mas lento para UAT real com lideranca da loja. | |
| O que o teste prova | Cadeia tecnica, nao execucao fisica | Dispositivo registrado, permissao ok, token valido/provider aceitou, app recebeu ou abriu quando possivel; tarefa nenhuma muda de estado. | Yes |
| O que o teste prova | Entrega visivel no aparelho basta | Simples, mas fraco para diagnosticar token/provider/permissao. | |
| O que o teste prova | Teste vira confirmacao operacional | Bloqueado pelo produto: push nunca resolve tarefa nem prova execucao. | |
| Resultado no Command Center | Linha do tempo curta por aparelho | Solicitado por quem/quando, provider aceitou/recusou, token invalido/permissao negada/local-only, aberto no app quando houver sinal, e proxima acao sugerida. | Yes |
| Resultado no Command Center | So status atual | Limpo, mas perde historico para entender por que falhou. | |
| Resultado no Command Center | Log tecnico detalhado | Bom para debug, ruim para lideranca e risco de vazar identificadores. | |
| Sem push remoto | Pode seguir com Atencao se o fluxo nao depende de push naquele momento | Tarefas, Hoje e sync continuam; push local/manual fica como mitigacao; fica Bloqueado quando o objetivo do UAT e provar push remoto. | Yes |
| Sem push remoto | Sempre bloqueado sem push remoto | Rigido, mas pode impedir teste de cadastro/lote/sync que ainda e util. | |
| Sem push remoto | Nunca bloqueia | Permissivo demais; esconderia que o canal de cobranca forte nao esta pronto. | |

**User's choice:** `1` for all four questions.
**Notes:** Push test remains a provider/device diagnostic, never task execution proof.

---

## Verdade da build instalada

| Question | Option | Description | Selected |
|---|---|---|---|
| Onde ver a build | Mobile e Command Center | Mobile mostra versao/ambiente/API alvo em sobre/diagnostico e Command Center mostra por aparelho. | Yes |
| Onde ver a build | So no Command Center | Bom para lideranca, mas o operador nao consegue confirmar no proprio aparelho. | |
| Onde ver a build | So no mobile | Util no aparelho, mas fraco para auditoria e suporte do piloto. | |
| Campos obrigatorios | Versao, build, ambiente, API alvo e commit/artefato mascarado | Suficiente para saber se o APK e atual sem vazar URL privada, token, ou detalhe sensivel. | Yes |
| Campos obrigatorios | So versao e ambiente | Limpo, mas insuficiente para comparar com staging atual. | |
| Campos obrigatorios | Tudo tecnico completo | Bom para debug, ruim para captura publica e operacao. | |
| Desatualizado | Comparado contra o artefato staging aprovado | Se a build instalada for anterior ao APK/commit liberado para UAT, aparece Atualizar antes do piloto. | Yes |
| Desatualizado | Comparado contra main sempre | Mais rigido, mas pode marcar desatualizado por commit que ainda nem virou APK aprovado. | |
| Desatualizado | So manualmente | Simples, mas depende de alguem lembrar de marcar. | |
| APK antigo | Atencao ou Bloqueado conforme risco da etapa | Pode ler/sincronizar se compativel, mas bloqueia UAT/release quando falta campo/fluxo critico da fase atual. | Yes |
| APK antigo | Sempre permitir se loga | Perigoso; login nao prova compatibilidade operacional. | |
| APK antigo | Sempre bloquear se nao e a ultima build | Seguro, mas pode atrapalhar diagnostico e migracao gradual. | |
| Politica de versao | Versao por fase do piloto | Phase 12 vira algo como `0.12.0`, builds Android incrementam, e fica facil saber que o APK e da fase certa. | Yes |
| Politica de versao | Versao v1 piloto | Usar algo como `1.0.0-piloto`, mais bonito para apresentacao, mas menos claro para rastrear fase por fase. | |
| Politica de versao | Voce decide | Planner escolhe, desde que nunca mais saia `0.0.0` no APK piloto. | |

**User's choice:** `1` for all five questions.
**Notes:** User asked whether the app would show the running version because installation currently shows `0.0.0`. Current sources confirm `apps/mobile/app.json` and `apps/mobile/package.json` both declare `0.0.0`; Phase 12 must fix pilot version truth.

---

## UAT guiado e bloqueios do piloto

| Question | Option | Description | Selected |
|---|---|---|---|
| Forma do UAT | Checklist guiado no Command Center + execucao no mobile | Lideranca acompanha passos, aparelho executa, e cada etapa vira pass/block com evidencia sanitizada. | Yes |
| Forma do UAT | Documento manual separado | Simples, mas facil ficar fora da verdade do sistema. | |
| Forma do UAT | So fluxo livre no app | Parece natural, mas nao prova que todos os gates do piloto foram testados. | |
| Etapas obrigatorias | Fluxo completo de piloto real | Preparar turno, reutilizar/criar produto real, registrar lote real, resolver terminalmente, convergir segundo aparelho, conferir Command Center, testar push, validar camera/evidencia ou fallback, e fechar turno. | Yes |
| Etapas obrigatorias | So cadastro/lote/sync | Rapido, mas deixa push, camera e fechamento sem prova. | |
| Etapas obrigatorias | So dispositivo/push/build | Foca a fase 12, mas nao prova o ciclo operacional central. | |
| Bloqueios do piloto | Bloqueio com causa + proxima acao | Sem aparelho aprovado, sync central velho, token invalido, camera negada, loja errada, produto em revisao, conflito, turno inseguro, sempre com o que fazer em seguida. | Yes |
| Bloqueios do piloto | Lista simples de erros | Facil de implementar, mas fraca para lideranca agir. | |
| Bloqueios do piloto | So status geral pass/block | Limpo, mas esconde o porque. | |
| Evidencia publica | Evidencia sanitizada e sem dado real sensivel | Status, timestamps, nomes operacionais ficticios/mascarados, outputs de comando seguros, screenshots so se revisados; nada de token, URL privada, foto real, build URL, ID sensivel. | Yes |
| Evidencia publica | Captura completa para facilitar auditoria | Mais rica, mas perigosa em repo publico. | |
| Evidencia publica | Sem evidencia, so marcar pass/block | Seguro demais, mas fraco para provar prontidao. | |

**User's choice:** `1` for all four questions.
**Notes:** UAT must become an operational truth surface, not just a detached document.

---

## the agent's Discretion

- Exact schemas, endpoint names, UI layout, stale-time thresholds, retention windows, build metadata injection strategy, test fixture shape, and UAT artifact format are left to planning.

## Deferred Ideas

None.
