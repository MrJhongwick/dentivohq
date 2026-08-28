# DentivoHQ architecture

DentivoHQ is a pnpm monorepo with four deployable applications: a static Astro landing and booking site, a Hono Cloudflare Worker API, and separate React clinic-dashboard and platform-console applications.

The API is the only browser-facing component allowed to access PostgreSQL or R2. Protected tenant routes use `/api/v1/clinics/:clinicId/...` and always resolve the authenticated membership independently of the supplied clinic identifier. Public booking routes use `/api/v1/public/clinics/:clinicSlug/...`, Cloudflare rate limiting, short-lived email verification, and a second transactional availability check.

PostgreSQL owns durable state. Every tenant-owned record carries `clinic_id`, tenant queries filter it explicitly, and active dentist appointments are protected from overlap by a GiST exclusion constraint. Timestamps are stored in UTC and availability is derived from the location timezone, recurring schedules, exceptions, time off, service duration, and appointments.

Better Auth owns email/password and Google sessions. Clinic permissions live in `@dentivohq/auth`; hiding frontend controls is never used as authorization. Resend and R2 are behind API services, notification jobs are persisted and idempotent, and sensitive objects are private by default.

The initial `MVP` plan and its enforced limits live in `@dentivohq/config`. Stripe or another payment provider can later attach to the subscription boundary without leaking provider objects into domain code.
