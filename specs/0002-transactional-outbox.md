# 0002 — Outbox transacional para publicar eventos

**Status**: accepted
**Data**: 2026-07-18

## Contexto

Toda escrita de agregado (ex.: `Study` muda de status) precisa publicar um evento de
integração. Escrever no Postgres e publicar no NATS são duas operações; qualquer ordem
ingênua perde evento ou publica evento de transação que sofreu rollback (dual-write).

## Decisão

Padrão outbox: o `UnitOfWorkTypeOrm` persiste os eventos não commitados dos agregados na
tabela `outbox` **na mesma transação** da escrita, validando o envelope contra os schemas
zod de `@radflow/shared` antes de gravar. Um `OutboxRelay` varre a tabela com
`FOR UPDATE SKIP LOCKED` e publica no JetStream com `Nats-Msg-Id = eventId`, apagando a
linha só após o ack do broker.

## Alternativas consideradas

- **Publicar direto após o commit**: janela de falha entre commit e publish perde eventos;
  inaceitável para o fluxo clínico (um estudo assinado sem ORU emitido).
- **CDC (Debezium)**: resolve o mesmo problema lendo o WAL, mas adiciona Kafka Connect ao
  compose e esconde a fronteira do evento dentro do schema do banco.
- **Event sourcing completo**: reescreveria o modelo de persistência inteiro para um
  benefício que o domínio não pede.

## Consequências

- Atomicidade real: evento existe se e somente se a transação commitou.
- Entrega at-least-once (relay pode republicar); o dedupe por `Nats-Msg-Id` no JetStream
  e consumidores idempotentes absorvem duplicatas.
- Latência extra de um ciclo de varredura do relay (dezenas de ms) — irrelevante aqui.
- A validação zod na escrita da outbox transforma contrato quebrado em erro de teste, não
  em incidente de produção.
