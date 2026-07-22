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

Decisões previstas (criar quando o épico correspondente começar):

- NATS JetStream vs Kafka para o barramento de eventos
- Outbox pattern para atomicidade PG + evento
- HL7 v2 (ORM/ORU) vs FHIR para a integração clínica do MVP
- OHIF embutido via iframe vs integração por pacote
- Estrutura do eval harness de LLM (casos rotulados, métricas, CI)
