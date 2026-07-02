---
title: Controle GPP - exploracao de produto
date: 2026-07-02
context: Ideia discutida durante o teste real da build 0.12.0 build 170, sem alterar a versao em teste.
status: draft
---

# Controle GPP - exploracao de produto

## Objetivo

Criar uma frente separada do Validade Zero para substituir o trabalho manual de caderno, etiquetas fisicas e caixas por setor usado pelo GPP, sem misturar essa frente com o piloto atual de validade/sincronizacao.

O objetivo nao e o app decidir sozinho a baixa oficial do GPP. O objetivo e registrar o fato operacional com dados completos, enviar para a central quando online e entregar ao GPP uma fila organizada, agrupada e auditavel para agilizar a baixa no sistema interno dele.

## Contexto operacional observado

- Hoje existem cadernos de avaria e transferencia por setor.
- A loja vai migrar parte do processo para caixas por setor, onde as etiquetas fisicas serao colocadas com nome do setor, quantidade e informacoes relacionadas.
- O GPP passa depois, confere as etiquetas/caderno/caixa e faz a baixa no sistema dele.
- O GPP precisa do codigo do produto para baixar.
- Em hortifruti pesado, o codigo de barras da etiqueta de balanca pode variar; por isso o codigo curto do produto, como `162` para tomate, deve ser o identificador principal.
- O app deve aprender esses codigos: depois que `162 - Tomate` for usado, deve sugerir automaticamente pelo codigo ou pelo nome.
- Existem casos em que uma avaria continua existindo, mas o produto sai da avaria para outro setor como reaproveitamento/reprocessamento, por exemplo tomate ruim indo para rotisserie.
- Nesses casos, a avaria nao some; nasce uma movimentacao ligada a ela para reprocessamento/transferencia, e o GPP baixa de forma diferente.
- Historicamente, quando havia reaproveitamento, uma etiqueta ia para o caderno de avaria e outra para o caderno do setor que recebeu, marcada com `R`.
- O processo evoluiu para tres trilhas fisicas: caderno de avaria, caderno dos setores e caderno de reaproveitamento.
- Mesmo assim, para ser reaproveitado, o produto primeiro precisa entrar como avaria. Reaproveitamento nao nasce sozinho.

## Decisoes ja alinhadas

### Nome e area do app

O nome recomendado para a nova area e **Controle GPP**.

Motivo: `Caderno GPP` remete demais ao papel, `Baixas GPP` e estreito demais, e `Movimentacoes GPP` e correto mas frio. `Controle GPP` cobre avaria, reaproveitamento, transferencia para setor, pendencias, baixas e divergencias.

### Separacao do fluxo de validade

A build `0.12.0` build `170` deve ficar congelada para testar validade e sincronizacao.

O Controle GPP deve nascer em paralelo, como frente nova, sem alterar a versao em teste:

- primeiro especificacao e UX;
- depois branch separada;
- backend aditivo, com novas tabelas/endpoints;
- feature flag desligada por padrao;
- web validado antes de nova APK;
- mobile GPP somente em build futura, provavelmente `0.13.0`.

### Autenticacao e papeis

Nao criar um sistema separado de login.

Usar o mesmo login, convite, lojas e backend existentes, adicionando o papel **GPP**.

Papeis esperados:

- `colaborador`: usa Hoje e registra movimentacoes do proprio setor.
- `lideranca`: acompanha a loja, fechamento, historico e equipe.
- `gpp`: acessa Controle GPP da propria loja.
- `admin`: gerencia lojas, convites e papeis.

O GPP e sempre por loja. Exemplo: GPP da Loja 18 ve somente Loja 18.

Convite GPP deve exigir loja obrigatoria e papel `GPP`. Setor pode ficar vazio, porque o GPP atua na loja inteira.

### Mobile e web

Mobile do setor:

- entrada rapida para registrar avaria, transferencia e reaproveitamento;
- fluxo grande, direto e usavel com uma mao;
- comecar pelo codigo do produto;
- busca por nome como plano B.

Web do GPP:

- principal superficie de baixa e fechamento;
- visao agrupada para velocidade;
- detalhe por lancamento para auditoria;
- filtros por setor, tipo, data, status e produto/codigo.

Mobile do GPP:

- apoio para conferencia andando pela loja;
- nao deve ser a superficie principal de baixa no primeiro desenho, a menos que o teste mostre necessidade.

### Organizacao da visao do GPP

Comecar por **setor**, porque o trabalho fisico do GPP nasce por setor: caderno/caixa do hortifruti, rotisserie, padaria, frios etc.

Dentro de cada setor, permitir filtro por tipo:

- Tudo
- Avaria
- Transferencia
- Reaproveitamento
- Divergencias
- Baixados

A lista padrao deve ser agrupada por codigo/produto, com possibilidade de abrir os lancamentos individuais.

Exemplo:

```text
Hortifruti

162 - Tomate
Avaria: 3,250kg
Reprocessamento para Rotisserie: 1,000kg
3 lancamentos
```

### Campos obrigatorios

Para qualquer movimentacao que vai para o GPP, o app deve exigir dados completos.

Campos base:

- codigo do produto;
- produto;
- quantidade/peso;
- unidade;
- tipo;
- setor origem;
- colaborador;
- data/hora;
- status central.

Campos condicionais:

- setor destino obrigatorio para transferencia e reaproveitamento;
- motivo obrigatorio para avaria;
- observacao opcional;
- vinculo com lote de validade quando a movimentacao nasce do fluxo de validade.

Regra decidida: para avaria, transferencia e reaproveitamento, bloquear finalizacao se faltar codigo, quantidade/peso ou destino obrigatorio. Evitar criar pendencia incompleta para o GPP.

### Avaria como registro principal

Na realidade da loja, o GPP trata a saida do produto como **avaria**. Por isso, no modulo GPP, `perda` nao deve ser o tipo principal.

Modelo recomendado:

- `Avaria` e o registro principal.
- `Reaproveitamento` e uma movimentacao vinculada a uma avaria.
- `Transferencia para setor` pode existir como destino/movimento quando a avaria ou produto sai para outro setor.
- `Baixa GPP` e o fechamento final feito pelo GPP.

Fluxo base:

```text
Avaria registrada -> Baixada pelo GPP
```

Fluxo com reaproveitamento:

```text
Avaria registrada -> Reaproveitamento vinculado -> Baixada pelo GPP
```

O reaproveitamento deve mostrar saldo:

```text
Avaria registrada: 5,000kg
Reaproveitado para Rotisserie: 1,000kg
Saldo em avaria: 4,000kg
```

Se o saldo restante tambem tiver destino depois, novas movimentacoes podem ser vinculadas a mesma avaria ate a baixa final.

### Integracao com validade

Quando uma retirada/perda for registrada no fluxo de validade, o app deve abrir automaticamente a etapa do Controle GPP antes de concluir. Para o GPP, isso deve virar uma **avaria por vencimento**, e nao um tipo solto chamado perda.

- codigo do produto;
- quantidade/peso;
- unidade;
- motivo;
- setor/destino quando aplicavel.

Ao confirmar:

1. o lote sai da fila ativa de risco somente se os criterios operacionais forem atendidos;
2. nasce uma pendencia de avaria no Controle GPP;
3. o GPP ve a pendencia no web/mobile dele;
4. depois que o GPP baixa no sistema interno, ele marca como baixado/finalizado no app.

Produtos que nao estao no controle de validade tambem podem entrar pelo botao separado `Controle GPP`. Exemplo: tomate ruim retirado da venda sem lote monitorado. Nesse caso, o colaborador registra apenas a avaria no Controle GPP com codigo, quantidade, motivo e setor.

Produtos que ja estao no controle de validade continuam normalmente no fluxo `Hoje`. Exemplo: cabotia cortada registrada para acompanhar validade. Se vencer, nao vender e ainda puder ser usada pela rotisserie/cozinha, o lote deve ter uma acao como `Enviar para reaproveitamento`.

Essa acao deve:

1. confirmar que o produto saiu da area de venda;
2. resolver o risco de validade;
3. criar uma avaria por vencimento no Controle GPP;
4. criar o reaproveitamento vinculado a essa avaria;
5. exigir codigo, quantidade/peso e setor destino.

Regra: reaproveitamento so pode resolver o `Hoje` se o produto saiu da area de venda. Se ainda esta exposto para venda, nao resolve.

### Piloto com redundancia fisica

No inicio, manter caderno/caixa fisica como redundancia operacional.

Fluxo de validacao:

- setor registra no app;
- setor ainda coloca a etiqueta no caderno/caixa;
- GPP compara app contra fisico;
- divergencias viram aprendizado/correcao;
- apos alguns dias consistentes, avaliar reducao do papel.

Regra de piloto: em caso de divergencia entre app e fisico, o fisico vence ate o sistema ganhar confianca.

### Ciclo de vida decidido

Fluxo principal simples:

```text
Pendente -> Baixado
```

Fluxo de excecao:

```text
Pendente -> Divergencia -> Corrigido -> Baixado
```

Regras:

- o GPP marca a divergencia;
- setor/lideranca corrige dados operacionais quando necessario;
- o GPP pode fazer correcao pequena com justificativa;
- a baixa final e sempre do GPP;
- tudo fica auditado.

### Permissoes decididas

Todas as permissoes precisam ser validadas no backend. A UI pode esconder ou mostrar botoes, mas a regra de permissao real fica na central.

Regras por papel:

- `colaborador`: cria lancamentos e corrige somente lancamentos que ele mesmo criou, enquanto ainda estao `Pendente`.
- `lideranca`: corrige lancamentos do setor/loja sob responsabilidade.
- `gpp`: marca `Baixado`, marca `Divergencia` e pode fazer correcao pequena somente com justificativa.
- `admin`: audita, cancela, estorna e gerencia convites/papeis.

Outro colaborador comum nao pode corrigir o lancamento de um colega. Isso preserva responsabilidade e evita que a auditoria vire "todo mundo mexe em tudo".

Campos que o criador pode corrigir enquanto `Pendente`:

- quantidade/peso;
- unidade;
- setor destino;
- motivo;
- observacao;
- codigo/produto, com historico obrigatorio porque afeta a baixa do GPP.

Depois que o lancamento esta `Baixado`, ninguem edita direto. Qualquer ajuste vira estorno/correcao administrativa com justificativa.

### Cancelamento decidido

Lancamento `Pendente` pode ser cancelado quando foi erro claro, sempre com motivo obrigatorio.

Regras:

- criador cancela o proprio lancamento pendente;
- lideranca cancela pendente do setor/loja;
- GPP evita cancelar como fluxo normal; quando algo nao bate, marca `Divergencia`;
- admin pode cancelar ou estornar com justificativa;
- lancamento `Baixado` nao cancela direto, apenas estorna/corrige administrativamente.

### Evidencia decidida

No MVP, foto nao deve ser obrigatoria para todo lancamento, para nao travar a velocidade operacional.

Regras:

- avaria normal: foto opcional;
- reaproveitamento: foto opcional;
- divergencia: observacao obrigatoria e foto opcional recomendada;
- cancelamento/estorno: motivo obrigatorio e foto opcional;
- vencido vindo do `Hoje`: pedir foto ou motivo sem foto, por ser mais critico.

### Tempo real decidido como camada aditiva

Tempo real e desejado para Controle GPP e, se provar estabilidade, tambem para `Hoje`.

Principio:

```text
Tempo real acelera a visibilidade, mas a verdade continua sendo o banco central.
```

Arquitetura recomendada:

1. mobile/web envia comando para API;
2. API grava no banco central primeiro;
3. somente depois do sucesso central, API publica evento para a sala da loja;
4. web/mobile conectados recebem o evento;
5. ao receber evento, a tela busca snapshot atualizado da central;
6. se tempo real cair, a tela continua funcionando com refresh manual/polling fallback.

Tecnologia candidata:

- Cloudflare Durable Objects com WebSocket Hibernation, por loja/sala;
- exemplo de sala: `store-room:loja-18`;
- evento exemplo: `gpp_entries_changed`, `today_tasks_changed`;
- mobile setor nao precisa manter socket sempre aberto; ele salva na central;
- web GPP e mobile GPP conectam quando a tela esta aberta;
- `Hoje` pode receber a mesma camada depois, sem reescrever a regra de sync.

Essa camada precisa ser aditiva e reversivel:

- nao mexer na build `0.12.0` build `170`;
- nao alterar o contrato atual de salvar lote/tarefa em producao de teste;
- nao substituir polling/refresh atual no primeiro corte;
- nao marcar sucesso por evento em tempo real;
- evento perdido nao pode perder dado, porque a tela sempre reconsulta a central.

### Sincronizacao e verdade central

Requisito forte:

Quando online, o lancamento so deve aparecer como salvo depois que a central confirmar.

Estados visiveis:

- `Registrando na central...`
- `Registrado na central`
- `Sem internet: pendente neste aparelho`
- `Falha na central: tente novamente`

Regra:

- online: salvar na central primeiro;
- offline real: salvar local como pendente explicito;
- web/mobile do GPP leem da central;
- se nao chegou na central, o GPP nao deve ver como baixado nem como sucesso;
- nada de mostrar `sincronizado` sem ack central.

O web/mobile do GPP deve atualizar rapido, por polling curto ou mecanismo em tempo real a definir. O produto esperado e: lancou no app online, aparece para o GPP quase imediatamente.

## Direcao visual e UX

O Controle GPP deve parecer uma ferramenta operacional de loja, nao dashboard generico.

Direcao:

- fundo calmo igual ao app atual;
- superficies brancas;
- bordas discretas;
- raio curto, proximo de 8px;
- tipografia legivel;
- verde para acao/confirmado;
- vermelho para divergencia/perda critica;
- amarelo para atencao;
- sem graficos decorativos;
- sem gamificacao;
- sem esconder incerteza.

### Mobile - entrada rapida

Fluxo recomendado:

1. Produto
   - campo principal: codigo do produto;
   - exemplo: digitar `162` preenche `Tomate`;
   - busca por nome como alternativa.
2. Tipo
   - avaria, perda, transferencia, reprocessamento.
3. Quantidade
   - valor e unidade.
4. Destino
   - aparece quando necessario.
5. Confirmacao
   - resumo claro antes de registrar na central.

### Web - Controle GPP Hoje

Estrutura recomendada:

- topo com loja, data e status de atualizacao;
- abas: Pendentes, Baixados, Divergencias, Todos;
- filtros: setor, tipo, data, produto/codigo;
- primeiro nivel por setor;
- dentro do setor, agrupamento por codigo/produto;
- detalhe lateral com lancamentos individuais.

Acoes esperadas:

- copiar/ver codigo grande;
- marcar baixado;
- marcar divergencia;
- abrir detalhe;
- corrigir/solicitar correcao a definir.

## Pontos ainda em aberto

1. Fluxo de divergencia:
   - se o GPP encontrar quantidade errada;
   - se codigo/produto estiver errado;
   - se o fisico nao estiver na caixa/caderno;
   - se o setor discordar.

2. UI/UX final das telas:
   - tela web do GPP por setor;
   - detalhe lateral do lancamento;
   - fluxo mobile de registro rapido;
   - melhoria da UI de convites/equipe para incluir papel GPP.

3. Contrato tecnico do backend:
   - tabelas novas do Controle GPP;
   - endpoints novos;
   - idempotency key obrigatoria;
   - audit events;
   - feature flag;
   - tempo real aditivo.

4. Ordem de implementacao:
   - UI/UX web do GPP;
   - contratos e backend;
   - mobile entrada rapida;
   - integracao com avaria/reaproveitamento do fluxo de validade;
   - papel GPP e melhoria da tela de convites/equipe.

## Proxima discussao recomendada

Definir o fluxo de divergencia em detalhe.

Pergunta aberta: quando o GPP encontra erro de quantidade, codigo, produto, setor ou etiqueta fisica, qual deve ser a experiencia perfeita para corrigir sem atrasar a baixa e sem perder responsabilidade?
