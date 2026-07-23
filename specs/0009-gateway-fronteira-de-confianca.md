# 0009 — Gateway como fronteira de confiança (JWT fora, headers dentro)

**Status**: accepted
**Data**: 2026-07-22

## Contexto

A autenticação (JWT + RBAC por rota) vive no api-gateway. Os serviços internos precisam
saber _quem_ agiu (para o audit log) sem cada um revalidar token.

## Decisão

O gateway é a única porta de entrada autenticada: valida o JWT, aplica RBAC por rota e
encaminha a identidade como `X-User-Id`/`X-User-Role` (e o `traceparent`) para os
serviços. Serviços internos confiam nesses headers e não expõem autenticação própria;
tentativas negadas (403) são auditadas pelo próprio gateway no audit log do worklist.

## Alternativas consideradas

- **JWT validado em cada serviço**: defesa em profundidade real, mas multiplica config de
  segredo e código de auth por serviço num demo onde os serviços não são publicamente
  roteáveis.
- **mTLS entre serviços**: correto em produção (zero-trust), custo de PKI
  desproporcional aqui.
- **Sessão no gateway (stateful)**: quebraria a horizontalidade e não demonstra o padrão
  de mercado (bearer token).

## Consequências

- RBAC e auditoria de negativas ficam num único lugar, fáceis de testar (e2e do gateway).
- Premissa explícita: a rede interna do compose é confiável. Os ports publicados dos
  serviços existem só para debug local — em produção seriam removidos e a premissa
  viraria mTLS/service mesh (evolução declarada, não surpresa).
- O audit trail registra o ator real em 100% das escritas, incluindo as recusadas.
