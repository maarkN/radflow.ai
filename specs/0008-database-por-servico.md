# 0008 — Banco de dados por serviço

**Status**: accepted
**Data**: 2026-07-21

## Contexto

Worklist e dictation começaram compartilhando o banco `radflow` por conveniência do
compose. As migrações de outbox dos dois serviços colidiram na mesma tabela — sintoma
clássico de fronteira furada.

## Decisão

Cada serviço com estado tem seu banco lógico no mesmo Postgres físico: `radflow`
(worklist) e `radflow_dictation` (dictation), criados por `ops/postgres/init.sql`.
Nenhum serviço lê tabela de outro; toda comunicação é por evento (JetStream) ou HTTP.

## Alternativas consideradas

- **Banco único com schemas separados**: resolveria a colisão, mas manteria a tentação de
  join entre domínios e um único ponto de migração.
- **Instâncias Postgres separadas**: isolamento máximo, porém dobra o consumo de RAM do
  compose sem ganho didático — bancos lógicos já provam a fronteira.
- **Manter compartilhado com prefixo de tabela**: gambiarra que só adia o problema.

## Consequências

- A colisão de migração desapareceu por construção (`migrationsTableName` próprio por
  serviço completa o isolamento).
- Consistência entre serviços é eventual e explícita (saga de assinatura
  dictation⇄worklist com retries e tolerância a 409).
- O compose continua com um único container de Postgres — barato e fiel ao padrão.
