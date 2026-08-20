# Backup Strategy

## What gets backed up
- **PostgreSQL** — the only stateful data store (users, workspaces, jobs, notifications, invites, everything). `scripts/backup-db.sh` runs `pg_dump`, gzips the output, and prunes anything older than 14 days.
- **Redis** — deliberately NOT backed up. It only holds in-flight BullMQ job state; Postgres is the durable source of truth for job history (see `jobs` table), so losing Redis loses at most a few seconds of in-flight work, not data.
- **Uploaded files (avatars, etc.)** — stored in Cloudflare R2, which has its own durability guarantees (R2 replicates automatically) — no separate backup needed unless bucket versioning is disabled.

## Schedule
Run `scripts/backup-db.sh` daily via cron (example line included at the top of the script). For a managed host (Render, Railway, etc.) that doesn't give you a persistent VM to run cron on, use the platform's own scheduled-job/cron feature to run the same script, or use your database provider's built-in automated backups if using managed Postgres (Neon, RDS, etc. — check whether this is already covered before adding a second backup system).

## Retention
14 days of daily backups by default (`RETENTION_DAYS` env var). Adjust based on compliance requirements — for handling payment data (Razorpay integration), consider whether your business needs longer retention for dispute/audit purposes.

## Restore procedure
```bash
gunzip -c roleguard_YYYYMMDD_HHMMSS.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```
Test this restore procedure periodically against a scratch database — an untested backup is not a backup, it's a hope.

## What this does NOT cover
- Point-in-time recovery (PITR) — daily snapshots only. For finer-grained recovery, enable your Postgres provider's WAL-based PITR if available (most managed providers offer this natively; don't hand-roll it).
- Cross-region replication — out of scope for this deployment size; revisit if/when uptime requirements justify the added complexity.