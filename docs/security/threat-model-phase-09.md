# Threat model da Fase 09: autenticação e privacidade

## Escopo e fronteiras

Este documento cobre o acesso fechado do piloto, desde o convite administrativo até a sessão operacional, a recuperação de conta e o recebimento de solicitações LGPD. O cliente nunca define papel, loja ou capacidade efetiva: esses valores são resolvidos no servidor a partir do vínculo ativo.

As fronteiras relevantes são:

- link de convite para ativação de primeiro acesso;
- senha para verificador de credencial;
- bearer/cookie de sessão para contexto de capacidades;
- formulário de direitos LGPD para armazenamento auditável;
- adapter `AuthProvider` para um eventual provedor externo.

## Ameaças e controles

| Ameaça | Cenário | Controles implementados | Risco residual |
| --- | --- | --- | --- |
| Spoofing | Cliente envia papel, loja ou capacidades privilegiadas. | Login e ativação rejeitam campos desconhecidos; `AuthorizationService` recompõe capacidades de vínculos ativos. | Comprometimento do banco ou da chave de ambiente exige resposta operacional e rotação. |
| Credential stuffing | Senhas conhecidas são testadas repetidamente. | Resposta neutra, senha PBKDF2-SHA-256 com salt e pepper, limite de tentativas por identificador e auditoria sanitizada. | O limitador local não substitui rate limit distribuído no edge; deve ser reforçado antes de ampliar o piloto. |
| Token replay | Convite, recuperação ou sessão capturados são reutilizados. | Tokens aleatórios de 256 bits, somente HMAC-SHA-256 persistido, convites e recuperação de uso único, rotação/revogação de sessão e cookie `HttpOnly; Secure; SameSite=Strict`. | Um bearer ainda válido pode ser usado até revogação/expiração se o dispositivo estiver comprometido. |
| Invite leakage | Link de convite aparece em logs, auditoria ou banco. | Token bruto só existe na resposta administrativa e no canal de entrega; persistência e auditoria guardam somente identificadores e hashes. | O canal escolhido pela operação precisa limitar reencaminhamento e exposição do link. |
| Revocation lag | Sessão continua ativa depois de redução ou remoção do vínculo. | Cada verificação de sessão exige credencial ativa e vínculo ativo de sujeito/loja; refresh falha antes de retornar capacidades. | Caches futuros não podem contornar essa consulta sem estratégia explícita de invalidação. |
| Privacy request abuse | Corpo é usado para enviar segredo, URL assinada ou evidência binária. | Sessão obrigatória, schema estrito, comprimento e categorias limitados, rejeição de referências sensíveis e idempotência. | Texto pessoal legítimo continua sendo dado protegido e exige política operacional de acesso e retenção. |
| Provider lock-in | Neon Auth determina contratos e fluxo do produto de forma irreversível. | Rotas dependem do `AuthProvider` e do repositório de autenticação; contratos e autorização permanecem do domínio do produto. | Um adapter Neon Auth futuro precisará mapear revogação, convites e auditoria sem enfraquecer esses invariantes. |

## Dados persistidos

O banco guarda hash de token, hash de senha, salt, identificador, sujeito, loja, estado, validade e metadados operacionais limitados. Não há coluna para senha bruta, token bruto, URI de aparelho, URL assinada, binário de evidência ou segredo de ambiente.

Os peppers `AUTH_TOKEN_PEPPER` e `AUTH_PASSWORD_PEPPER` são obrigatórios fora da composição efêmera local e permanecem vazios no arquivo público `.env.example`.

## Eventos de segurança

Tentativas bloqueadas por estado de conta, vínculo ou capacidade registram somente sujeito conhecido, loja, operação, motivo e horário. Corpo da requisição, cabeçalho de autorização, senha e tokens não entram no evento. Solicitação de recuperação mantém a mesma resposta para conta existente ou inexistente.

## Decisão sobre Neon Auth

Neon Auth continua candidato por compartilhar o Postgres e oferecer integração com Better Auth, mas ainda é tratado como provider substituível. A v1 usa o adapter de piloto para não acoplar convites, sessões, estados de conta e LGPD a uma API beta. Uma migração futura deve preservar os contratos atuais e provar revogação no refresh, escopo por loja e auditoria sanitizada.
