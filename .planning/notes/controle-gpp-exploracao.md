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

## Decisoes ja alinhadas

### Nome e area do app

O nome recomendado para a nova area e **Controle GPP**.

Motivo: `Caderno GPP` remete demais ao papel, `Baixas GPP` e estreito demais, e `Movimentacoes GPP` e correto mas frio. `Controle GPP` cobre avaria, perda, transferencia, reprocessamento, pendencias, baixas e divergencias.

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

- entrada rapida para registrar avaria, perda, transferencia e reprocessamento;
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
- Perda
- Transferencia
- Reprocessamento

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

- setor destino obrigatorio para transferencia e reprocessamento;
- motivo obrigatorio para perda e avaria;
- observacao opcional;
- vinculo com lote de validade quando a movimentacao nasce do fluxo de validade.

Regra decidida: para perda/avaria/transferencia/reprocessamento, bloquear finalizacao se faltar codigo, quantidade/peso ou destino obrigatorio. Evitar criar pendencia incompleta para o GPP.

### Integracao com validade

Quando uma perda for registrada no fluxo de validade, o app deve abrir automaticamente a etapa do Controle GPP antes de concluir:

- codigo do produto;
- quantidade/peso;
- unidade;
- motivo;
- setor/destino quando aplicavel.

Ao confirmar:

1. o lote sai da fila ativa de risco somente se os criterios operacionais forem atendidos;
2. nasce uma pendencia no Controle GPP;
3. o GPP ve a pendencia no web/mobile dele;
4. depois que o GPP baixa no sistema interno, ele marca como baixado/finalizado no app.

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

1. Ciclo de vida/status do lancamento:
   - usar apenas `Pendente -> Baixado`;
   - ou incluir `Recebido pelo GPP` antes de `Baixado`;
   - como tratar `Divergencia`, `Corrigido` e `Cancelado`.

2. Permissoes finas:
   - quem pode marcar baixado;
   - quem pode marcar divergencia;
   - quem pode corrigir quantidade/codigo;
   - quem pode cancelar um lancamento.

3. Fluxo de divergencia:
   - se o GPP encontrar quantidade errada;
   - se codigo/produto estiver errado;
   - se o fisico nao estiver na caixa/caderno;
   - se o setor discordar.

4. Evidencia:
   - se foto da etiqueta/caixa deve ser opcional ou obrigatoria;
   - se assinatura/confirmacao do setor entra depois.

5. Atualizacao quase em tempo real:
   - polling curto no web;
   - SSE/WebSocket se justificar;
   - como mostrar freshness sem criar ansiedade operacional.

6. Ordem de implementacao:
   - UI/UX web do GPP;
   - contratos e backend;
   - mobile entrada rapida;
   - integracao com perda do fluxo de validade;
   - papel GPP e melhoria da tela de convites/equipe.

## Proxima discussao recomendada

Definir o ciclo de vida perfeito do lancamento GPP.

Pergunta aberta: quando um lancamento entra no Controle GPP, o melhor caminho e:

```text
Pendente -> Baixado
```

ou:

```text
Pendente -> Recebido pelo GPP -> Baixado
```

Tambem precisamos decidir como `Divergencia`, `Corrigido` e `Cancelado` entram sem deixar o fluxo pesado demais.
