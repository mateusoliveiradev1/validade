# Fechamento de turno verdadeiro

O turno nao termina com uma declaracao decorativa. Ele cria uma fotografia imutavel da seguranca da area de venda e mantem o trabalho pendente em vigor.

## Caminho seguro

`Turno encerrado com area segura` so pode ser confirmado depois de uma revalidacao central imediata e destas tres confirmacoes manuais, nesta ordem:

1. Area de venda conferida fisicamente.
2. Trabalho pendente explicado.
3. Passagem preparada para a proxima pessoa.

Risco vencido ou critico, tarefa central ativa, produto em revisao central, acao local descartada pela central, reconferencia aberta, conflito critico, sincronizacao critica pendente, leitura central vazia/stale/indisponivel, evidencia obrigatoria pendente, fechamento inseguro local ainda nao sincronizado e checklist incompleto bloqueiam o caminho seguro. Sem internet ou com cache incerto, o aplicativo oferece apenas o encerramento com pendencias.

## Caminho com pendencias

Fim de expediente nunca obriga uma declaracao falsa de seguranca. O encerramento com pendencias exige motivo, responsavel de continuidade, prazo e nota. Ele pode ser salvo no aparelho quando offline, mas fica visivelmente pendente ate o reconhecimento central.

Tarefas, alertas e escalonamentos continuam ativos. O reconhecimento da passagem significa apenas que a proxima pessoa recebeu o contexto; nao significa resolucao fisica nem retira o risco da area de venda.

## Reabertura e recuperacao

Uma reabertura requer motivo e resumo e gera uma nova revisao ligada ao fechamento original. A fotografia anterior, seus bloqueadores e seu recibo nao podem ser editados ou apagados.

Quando houver duvida sobre a area, reabra o fechamento ou escolha o caminho com pendencias, depois realize a conferencia fisica. Nao use a reabertura para corrigir um registro historico: a correcao precisa ser uma nova decisao auditada.

## Verificacao temporaria de migracao Neon

Use somente uma branch descartavel, criada a partir da branch de trabalho aprovada. O helper `scripts/neon-disposable-migration.mjs` captura a URI de conexao em memoria, aplica as migracoes e apaga a branch por padrao. Ele imprime apenas um resumo sanitizado.

Nao use a opcao de saida JSON de comandos de branch no terminal quando ela puder conter a URI. Nao cole URI, senha, identificador de projeto real, chave de objeto ou saida de conexao em issues, commits, logs ou documentacao. Confirme a politica de ciclo de vida privada de 90 dias no R2 a cada revisao trimestral antes do piloto.
