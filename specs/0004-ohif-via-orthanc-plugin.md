# 0004 — Visualizador DICOM: OHIF servido pelo plugin do Orthanc

**Status**: accepted
**Data**: 2026-07-19

## Contexto

O cockpit precisa exibir as imagens do estudo ao lado da ditado. Hospedar um viewer DICOM
completo é um projeto em si; o demo precisa de algo real (não screenshot) sem desviar o
foco do worklist/ditado.

## Decisão

Orthanc como mini-PACS com o plugin OHIF habilitado (`OHIF_PLUGIN_ENABLED=true` na imagem
`orthancteam/orthanc`). O integration-service resolve `AccessionNumber → StudyInstanceUID`
via `/tools/find` e o front abre `/ohif/viewer?StudyInstanceUIDs=<uid>` em nova aba/iframe.

## Alternativas consideradas

- **OHIF standalone (build próprio + DICOMweb)**: máximo controle de UX, mas exige build,
  config de datasources e CORS — custo alto para o mesmo resultado visual.
- **Cornerstone embutido no React**: viewer dentro do cockpit seria o ideal de produto,
  mas renderização DICOM correta (janelamento, séries, MPR) é exatamente o buraco de
  coelho que o escopo proíbe.
- **Thumbnail estático**: não demonstra integração PACS de verdade.

## Consequências

- Viewer clínico real com custo de configuração ~zero.
- UX de "abrir em outra aba" em vez de embed nativo — aceitável no demo e honesto na
  entrevista (o produto real embutiria o viewer).
- O contrato accession→UID fica testado no integration-service e não vaza para o front.
