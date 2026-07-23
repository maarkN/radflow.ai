# 0003 — HL7 v2 (ORM/ORU) em vez de FHIR para a integração clínica

**Status**: accepted
**Data**: 2026-07-19

## Contexto

O produto que este demo recria integra com RIS/HIS hospitalares: recebe pedidos de exame
e devolve laudos. Precisávamos escolher o protocolo da fronteira clínica do MVP.

## Decisão

HL7 v2 clássico: `ORM^O01` entrando e `ORU^R01` saindo, transportados por MLLP (TCP com
framing VT/FS/CR) na porta 2575, com ACK `AA/AE/AR`. Parser/builder próprios no
integration-service, com fixtures douradas nos testes.

## Alternativas consideradas

- **FHIR (R4)**: é o futuro e tem tooling melhor, mas o parque instalado de RIS/PACS que
  o produto-alvo integra fala majoritariamente HL7 v2 — a vaga cita explicitamente
  experiência com HL7. FHIR viraria uma fachada bonita sem provar a habilidade que
  interessa.
- **Ambos**: fora do orçamento de um demo; a fronteira ficou isolada no
  integration-service justamente para permitir adicionar um endpoint FHIR depois.
- **Biblioteca HL7 pronta**: as opções Node estão semi-abandonadas; o formato pipe-delimited
  é pequeno o bastante para um codec próprio testável (e o quirk do MSH-1/MSH-2 é um bom
  material de entrevista).

## Consequências

- Demonstra fluência no protocolo que os hospitais realmente usam.
- Codec próprio = manutenção nossa; mitigado por fixtures douradas e testes de round-trip.
- FHIR fica como evolução natural e localizada (novo adapter no integration-service).
