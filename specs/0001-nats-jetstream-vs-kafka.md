# 0001 — NATS JetStream como barramento de eventos

**Status**: accepted
**Data**: 2026-07-18

## Contexto

Os serviços (worklist, integration, dictation, report-ai) comunicam mudanças de estado
por eventos de integração (`radflow.study.*`, `radflow.report.*`, `radflow.hl7.*`).
Precisamos de entrega at-least-once, consumidores duráveis, replay e DLQ — num projeto
de demonstração que sobe inteiro com `docker compose up` numa máquina de desenvolvimento.

## Decisão

NATS JetStream como único broker: um stream `RADFLOW` cobrindo `radflow.>`, consumidores
duráveis com ack explícito (pacote `@radflow/messaging`), dedupe por `Nats-Msg-Id` e DLQ
em `radflow.dlq.<subject>` após esgotar as tentativas.

## Alternativas consideradas

- **Kafka**: padrão de mercado para event streaming, mas o custo operacional (broker +
  controller/ZooKeeper, tuning de partições, ~1 GB+ de RAM só do broker) não se paga num
  MVP de demo. Particionamento e retenção longa não são requisitos aqui.
- **RabbitMQ**: bom para filas clássicas, mas replay de stream e dedupe nativo exigiriam
  mais montagem manual (streams do Rabbit são recentes e menos difundidos).
- **Postgres LISTEN/NOTIFY**: zero infra extra, porém sem durabilidade/replay e acoplaria
  todos os serviços ao mesmo banco — contraria o isolamento por serviço (ADR 0008).

## Consequências

- Um único binário leve no compose; startup em segundos; API de consumidor simples.
- Semântica at-least-once exige consumidores idempotentes (tratado com dedupe por
  `eventId` e updates condicionais).
- Numa conversa de arquitetura, a resposta honesta é: em escala hospitalar multi-site,
  Kafka voltaria à mesa; a fronteira de eventos (envelope + subjects versionados) foi
  desenhada para tornar essa troca localizada no pacote `@radflow/messaging`.
