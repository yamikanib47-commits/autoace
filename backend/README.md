# AutoAce backend

Bun + Hono + SQLite REST backend implementing the contract in `../docs/ARCHITECTURE.md`.

## Local setup

```bash
cd backend
bun install
cp .env.example .env
bun run start
```

The first boot creates the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
Set a strong password before using this outside local development. Public submissions are rate-limited; admin endpoints require a bearer session token.

## Production notes

- Set `APP_ORIGIN` to the deployed frontend URL.
- Set `HOST=0.0.0.0` on hosts that route traffic to the process.
- Persist both `DATABASE_PATH` and `STORAGE_PATH`; they contain the application data and uploaded vehicle photos.
- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` only when Telegram notifications are wanted.
