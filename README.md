# DentivoHQ

Your dental practice, all in one place.

DentivoHQ is a multi-tenant dental appointment SaaS built as a pnpm monorepo for Cloudflare and PostgreSQL.

## Quick start

1. Install Node.js 24+ and pnpm 11+.
2. Copy `.env.example` to `.env` and provide local credentials.
3. Start PostgreSQL with `docker compose up -d postgres`, or use a Neon development database.
4. Run `pnpm install`, then `pnpm db:migrate`.
5. Run `pnpm dev`.

The apps run independently: landing on `4321`, API on `8787`, dashboard on `5173`, and console on `5174`.

See [docs/architecture.md](docs/architecture.md) and [docs/deployment.md](docs/deployment.md) for the system and deployment model.
