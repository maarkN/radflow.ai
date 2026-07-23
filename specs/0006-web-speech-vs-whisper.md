# 0006 — Ditado com Web Speech API em vez de Whisper server-side

**Status**: accepted
**Data**: 2026-07-20

## Contexto

O cockpit de ditado precisa transformar voz em texto para alimentar o gerador de laudo.
O plano original previa upload de áudio e transcrição server-side (Whisper) no
dictation-service.

## Decisão

Push-to-talk no navegador com a Web Speech API (`SpeechRecognition`): o texto reconhecido
é anexado ao laudo via `PUT /reports/:id/transcript`. Nenhum áudio sai do navegador; com
API indisponível (Firefox, CI), o textarea de transcrição manual é o fallback — e é o
caminho usado nos testes.

## Alternativas consideradas

- **Whisper no servidor**: qualidade e controle superiores, mas exige upload/armazenamento
  de áudio (superfície de PHI que o projeto proíbe), GPU ou latência alta de CPU, e um
  pipeline de mídia inteiro que não é o foco da vaga.
- **API paga de STT (Deepgram, AssemblyAI)**: qualidade boa, porém adiciona chave/custo e
  dependência de rede para uma demo que precisa rodar offline.

## Consequências

- Zero áudio persistido → história de privacidade limpa (alinhá com o disclaimer no PHI).
- Qualidade de reconhecimento varia por navegador/idioma; aceitável porque o artefato
  demonstrado é o fluxo laudo+IA, não o STT.
- O contrato do dictation-service já aceita transcrição pronta; plugar Whisper depois é
  adicionar um producer, não refazer o fluxo.
