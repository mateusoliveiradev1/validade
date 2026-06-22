# Auditoria e acesso operacional

## Regra de escopo

Toda leitura e mutacao operacional e avaliada pela identidade autenticada, pelo vinculo ativo e pela unidade alvo. O cliente apenas pede uma acao; ele nunca informa capacidades efetivas, escopo autorizado ou um papel confiavel.

- Colaborador registra a execucao fisica e evidencia dentro da unidade vinculada.
- Lideranca opera tarefas, auditoria local, invalidacao de evidencia e fechamento de turno na unidade vinculada.
- Administracao governa vinculos e politicas. Um vinculo administrativo nao concede fechamento de turno: isso exige um vinculo de lideranca ativo e explicito na mesma unidade.

IDs conhecidos de outra unidade recebem a mesma resposta generica de acesso negado. A resposta nao confirma se o recurso existe.

## Administracao de vinculos

No painel, identidade e unidade sao somente leitura depois da concessao. A pessoa administradora escolhe explicitamente o papel, revisa o impacto e confirma antes de gravar.

Cada concessao, mudanca de papel e revogacao inclui uma versao esperada e chave de idempotencia. Se outro administrador mudar o vinculo antes, a solicitacao e recusada para recarregar a lista; nunca se substitui a decisao anterior silenciosamente.

Ao reduzir uma lideranca para colaborador, a tela explica que atribuicao, aprovacao e fechamento de turno deixam de estar disponiveis. Revogar um vinculo nunca fecha, resolve ou oculta tarefas existentes.

## Linha de auditoria

O evento auditado contem ator, papel no momento, unidade, alvo, horario observado, horario recebido, resumo seguro, estado e metadados permitidos. Eventos de acesso negado registram apenas o contexto minimo de politica; eles nao registram corpo de requisicao, credenciais, URI de aparelho, chave privada ou binario.

O painel local deve usar filtros por unidade e exibicao cronologica. Para acesso excepcional de evidencia por administracao global, mostrar unidade alvo, exigir motivo e confirmacao explicita, e registrar `evidence.accessed_exceptionally` antes de mostrar metadados autorizados.

## Resposta a incidente de acesso

1. Preserve os eventos de auditoria e o identificador de negacao; nao altere eventos append-only.
2. Revogue ou reduza o vinculo comprometido com a versao atual da lista.
3. Revise eventos do ator e da unidade no intervalo do incidente.
4. Se houver suspeita de evidencia exposta, invalide o ativo com motivo e siga o runbook de ciclo de vida da evidencia.
5. Registre a correcao como novo evento; nao reescreva a linha historica.
