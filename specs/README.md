# specs/ — Architecture Decision Records

ADRs do RadFlow. Cada decisão arquitetural relevante ganha um arquivo
`NNNN-titulo-curto.md` (numeração sequencial), seguindo o formato:

```markdown
# NNNN — Título da decisão

**Status**: proposed | accepted | superseded by NNNN
**Data**: YYYY-MM-DD

## Contexto

Qual problema/força motivou a decisão.

## Decisão

O que foi decidido, de forma afirmativa.

## Alternativas consideradas

O que foi descartado e por quê.

## Consequências

O que fica mais fácil, o que fica mais difícil, dívidas assumidas.
```

## Índice

| #                                              | Decisão                                       |
| ---------------------------------------------- | --------------------------------------------- |
| [0001](0001-nats-jetstream-vs-kafka.md)        | NATS JetStream como barramento de eventos     |
| [0002](0002-transactional-outbox.md)           | Outbox transacional para publicar eventos     |
| [0003](0003-hl7v2-vs-fhir.md)                  | HL7 v2 (ORM/ORU) em vez de FHIR               |
| [0004](0004-ohif-via-orthanc-plugin.md)        | OHIF servido pelo plugin do Orthanc           |
| [0005](0005-llm-eval-harness.md)               | Eval harness com casos rotulados e gate no CI |
| [0006](0006-web-speech-vs-whisper.md)          | Web Speech API em vez de Whisper server-side  |
| [0007](0007-pacote-ddd-compartilhado.md)       | Extração do pacote @radflow/ddd               |
| [0008](0008-database-por-servico.md)           | Banco de dados por serviço                    |
| [0009](0009-gateway-fronteira-de-confianca.md) | Gateway como fronteira de confiança           |
