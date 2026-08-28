# Deployment and recovery

## Environments

Use separate Neon databases, Better Auth secrets, OAuth clients, Resend keys, R2 buckets, and Cloudflare bindings for preview and production. Configure all application URLs from environment variables; no `dentivohq.com` hostname is assumed.

Deploy `apps/landing`, `apps/dashboard`, and `apps/console` to Cloudflare Pages. The landing output contains a Pages rewrite that serves `/book/:clinicSlug` from the static booking application. Deploy `apps/api` with Wrangler after applying migrations from `packages/db`.

Required sequence:

1. Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
2. Back up the target database and run `pnpm db:migrate` against it.
3. Deploy the Worker with its secret variables, private `FILES` R2 binding, rate limiter, and scheduled trigger.
4. Deploy the three Pages applications with environment-specific public URLs.
5. Smoke-test authentication, clinic selection, public availability, verification, booking, appointment mutation, file authorization, and the scheduled notification handler.

## Backup and recovery

Enable Neon point-in-time recovery or scheduled logical backups before production data is accepted. Test restoration into a new database quarterly. R2 object lifecycle and recovery settings must match the clinic retention policy; database restoration alone does not restore deleted objects.

Never rewrite a migration that has reached production. Roll forward with a new migration. For a failed release, roll application code back while leaving compatible additive migrations in place; use an explicit corrective migration when schema rollback is unavoidable.
