# 0005 — Eval harness com casos rotulados e gate no CI

**Status**: accepted
**Data**: 2026-07-20

## Contexto

O report-ai transforma transcrição ditada em laudo estruturado (technique/findings/
impression) e sinaliza achados críticos. Saída de LLM sem avaliação vira regressão
silenciosa: um prompt "melhorado" pode piorar a detecção de pneumotórax sem ninguém
perceber.

## Decisão

Harness próprio em `report_ai/eval`: 16 casos rotulados (transcrição → seções esperadas +
flag de crítico), métricas de exatidão de seção e precisão/recall de achado crítico, e um
gate no CI que roda `AI_PROVIDER=stub` (determinístico, offline) em todo push. Rodadas com
provider real (Anthropic/OpenAI) são manuais, comparando contra o mesmo gabarito.

## Alternativas consideradas

- **Frameworks prontos (promptfoo, LangSmith, Ragas)**: bons para times grandes, mas
  adicionam dependência e config para avaliar um único endpoint; o harness manual cabe em
  ~200 linhas e mostra o raciocínio no código.
- **LLM-as-judge**: útil para texto livre, porém aqui o gabarito é estruturado — métrica
  exata é mais barata, determinística e auditável.
- **Sem eval ("olhar no olho")**: exatamente o anti-padrão que o projeto quer demonstrar
  que sabemos evitar.

## Consequências

- CI continua 100% offline e determinístico (regra do repositório).
- O conjunto de 16 casos é pequeno; ampliar com vagas reais rotuladas é dívida assumida.
- Trocar de modelo/prompt vira decisão medida: roda o harness com provider real e compara.
