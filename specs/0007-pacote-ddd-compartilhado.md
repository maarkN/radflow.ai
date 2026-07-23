# 0007 — Extração do pacote @radflow/ddd

**Status**: accepted
**Data**: 2026-07-21

## Contexto

Worklist e dictation repetiam a mesma fundação: Entity/AggregateRoot, Notification
pattern, Uuid com brand, UnitOfWork com outbox, relay, helpers de teste. Duplicar essa
base em cada serviço novo multiplicaria manutenção e divergência.

## Decisão

Pacote interno `@radflow/ddd` com o núcleo tático (domain/application) e a infraestrutura
comum (UnitOfWorkTypeOrm + outbox + audit log + relay + helpers de Testcontainers).
Serviços dependem dele via workspace e mantêm apenas seu domínio específico.

## Alternativas consideradas

- **Copiar e colar por serviço**: independência total, mas três cópias do UnitOfWork já
  haviam começado a divergir na validação de envelope.
- **Framework externo (ex.: @nestjs/cqrs, MikroORM UoW)**: acopla o _core_ ao framework —
  exatamente o que a regra "core sem NestJS" proíbe; e esconderia o design que o projeto
  quer exibir.
- **Monolito modular**: eliminaria o problema, mas o objetivo é demonstrar arquitetura de
  microsserviços orientada a eventos.

## Consequências

- Outbox, audit e locking otimista têm uma única implementação testada (specs de
  integração no próprio pacote).
- Mudança no pacote afeta todos os serviços — o preço é build orquestrado
  (`build:packages` antes de typecheck/test) e disciplina de versionamento interno.
- Helpers de teste com deep-import (`@radflow/ddd/dist/infra/testing/...`) mantêm o
  runtime de produção livre de dependências de teste.
