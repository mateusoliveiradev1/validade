# UAT staging - Loja 18

Este runbook prepara e valida o staging para o conjunto de 23 lojas com a Loja 18 como piloto. Ele nao autoriza criar produtos, lotes ou tarefas falsas: o primeiro cadastro operacional deve nascer do teste real feito pelo usuario.

## Escopo

- Conjunto staging: `loja-01` a `loja-23`.
- Loja piloto: `loja-18` / `Loja 18 - Staging`.
- Produtos/lotes: vazios ate o cadastro real.
- Categorias: catalogo central pre-semeado por loja.
- Evidencias/fotos: podem continuar degradadas enquanto R2 estiver desativado.

## Categorias do catalogo

| ID                                     | Nome                                      | Perfil                    |
| -------------------------------------- | ----------------------------------------- | ------------------------- |
| `frutas-climatericas`                  | Frutas climatericas                       | Inspecao FLV              |
| `frutas-citricas-nao-climatericas`     | Frutas citricas e nao climatericas        | Inspecao FLV              |
| `frutas-delicadas`                     | Frutas delicadas e berries                | Inspecao FLV              |
| `frutas-cortadas-prontas`              | Frutas cortadas e prontas                 | Reembalo/perda            |
| `folhosos-ervas`                       | Folhosos e ervas                          | Inspecao FLV              |
| `legumes-fruto`                        | Legumes de fruto                          | Inspecao FLV              |
| `raizes-tuberculos-bulbos`             | Raizes, tuberculos e bulbos               | Inspecao FLV              |
| `verduras-flor-caule`                  | Verduras de flor e caule                  | Inspecao FLV              |
| `cogumelos-frescos`                    | Cogumelos frescos                         | Validade formal           |
| `ovos`                                 | Ovos                                      | Validade formal           |
| `minimamente-processados-refrigerados` | Minimamente processados refrigerados      | Validade formal           |
| `polpas-sucos-refrigerados`            | Polpas, sucos e refrigerados FLV          | Validade formal           |
| `reembalados-fracionados-loja`         | Reembalados e fracionados na loja         | Reembalo/perda            |
| `embalados-secos-flv`                  | Frutas secas, castanhas e embalados secos | Validade formal           |
| `flores-plantas`                       | Flores e plantas                          | Monitorado no recebimento |

## Seed controlado

Dry-run:

```powershell
pnpm.cmd staging:seed-network
```

Aplicar em staging:

```powershell
pnpm.cmd staging:seed-network -- --apply --promote-auth
```

O seed faz:

- Cria/atualiza `stores` para 23 lojas.
- Cria/atualiza as categorias em cada loja.
- Replica vinculos ativos de `loja-piloto` para `loja-18`, sem criar pessoas novas.
- Com `--promote-auth`, move credenciais/sessoes ativas de `loja-piloto` para `loja-18`.
- Registra eventos auditaveis de seed.

O seed nao faz:

- Criar produtos.
- Criar lotes.
- Criar tarefas.
- Resolver ou apagar dados operacionais.

## Teste sem APK novo

1. Web staging: abrir `https://validade-five.vercel.app`, sair/entrar de novo e confirmar que o topo mostra `Loja 18 - Staging`.
2. Web Command Center: deve abrir vazio ou com apenas dados reais criados antes. Nao deve inventar lote/tarefa.
3. APK antigo: usar somente se o login conectar na API staging. Se mostrar erro de acesso seguro antes do login ou nao refletir Loja 18, o APK e anterior a configuracao staging atual.
4. Criar o primeiro produto real no APK antigo. Usar um ID de categoria da tabela acima enquanto o picker de categorias ainda nao existe no APK instalado.
5. Criar o primeiro lote real desse produto.
6. Voltar ao web Command Center e acionar atualizar. O produto/lote precisa aparecer pela central, nao so no aparelho.
7. Sair e entrar em outro navegador/dispositivo com conta da mesma Loja 18. O mesmo lote precisa aparecer.

## UAT guiado no Command Center

O Command Center agora mostra `UAT Loja 18` como checklist operacional. Use o painel para acompanhar as etapas, mas execute as acoes no mobile:

1. Preparar turno no APK aprovado e confirmar build compativel.
2. Cadastrar ou reutilizar produto real informado pelo usuario.
3. Registrar lote real do produto escolhido.
4. Executar resolucao terminal compativel e aguardar historico central.
5. Preparar turno em segundo aparelho ou segunda conta da Loja 18.
6. Comparar Hoje, historico e Command Center depois do sync.
7. Enviar teste seguro de push sem tratar push como execucao fisica.
8. Validar camera ou fallback sem foto em Android aprovado.
9. Fechar turno somente depois de revalidacao central e remocao de bloqueios.

Depois de cada etapa, revisar tambem `Bloqueios do piloto`. Um passo da checklist pode estar pendente por acao do operador, mas rollout fisico continua bloqueado quando o painel mostra severidade `Critico` ou `Externo` para aparelho, provider push, camera, build, produto, conflito, descarte, fechamento ou evidencia.

Estados permitidos no registro publico: `pending`, `passed`, `blocked` e `external_blocked`. Para `blocked` ou `external_blocked`, registre causa e proxima acao. Nao registre produto real, lote real, foto, serial de aparelho, token, provider ticket, build URL ou link privado no repositorio publico.

## Passa somente se

- `stores` contem 23 lojas ativas.
- `central_categories` contem 15 categorias ativas para `loja-18`.
- `central_products` e `central_lots` da Loja 18 so aumentam depois do teste real.
- Login web retorna `session.store.storeId = loja-18`.
- Uma conta fora da Loja 18 nao ve dados da Loja 18.
- Command Center e preparo de turno convergem para os mesmos produtos/lotes centrais.
- A checklist `UAT Loja 18` mostra produto/lote real como passed somente depois de entrada real do usuario, nunca por fixture, seed ou dado `FICTICIO`.
- `Bloqueios do piloto` nao mostra bloqueio critico ou externo sem resolucao registrada e evidencia publica segura.

## Limites conhecidos

- O APK antigo nao ganha picker de categorias sem build novo.
- Fotos/evidencias continuam sem binario real ate R2 ou alternativa de storage ser ativado.
- Push real em aparelho depende do APK/build/provider; web/API nao provam entrega push do Android.
- Enquanto `adb devices` nao listar um alvo aprovado e `pnpm.cmd test:e2e:mobile` nao passar, Android instalado, provider push, camera e UAT fisico seguem bloqueados externamente.
