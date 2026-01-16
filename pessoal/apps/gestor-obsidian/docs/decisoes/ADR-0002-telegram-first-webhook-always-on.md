# ADR-0002 — Telegram-first + webhook + serviço always-on

- **Status**: accepted
- **Data**: 2026-01-13

## Contexto
O canal primário do produto é o **Telegram**. Em produção, precisamos de:
- latência baixa (responder rápido),
- proatividade (jobs) e processamento contínuo,
- evitar conflitos comuns (polling duplicado, erro 409).

## Decisão
- **Telegram-first**: todo o produto precisa ser operável pelo Telegram.
- Em produção, rodar em **modo webhook**:
  - endpoint `POST /telegram/webhook` recebe updates e injeta no bot (`processUpdate`).
  - validação opcional via `TELEGRAM_WEBHOOK_SECRET` (header `x-telegram-bot-api-secret-token`).
- Em dev, suportar **polling**:
  - com lock local para reduzir chance de duas instâncias rodando ao mesmo tempo.
- O serviço roda **always-on** (ex.: Fly.io com `min_machines_running=1`).

## Consequências
- **Prós**
  - Produção mais estável (webhook) e com menos dependência de long polling.
  - Permite endpoints auxiliares (ex.: `/health`, `/oauth2callback`).
  - Dev continua simples via polling.
- **Contras**
  - Requer operação de `setWebhook` no Telegram (hoje externa; pode virar comando guiado).
  - Exige infra always-on (custo fixo).

## Alternativas consideradas
- Apenas polling (prod): rejeitado (mais frágil operacionalmente, conflitos 409).
- Long polling com worker separado: possível, mas perde simplicidade do webhook e do endpoint HTTP único.

