# Three.21 Studio — standalone Next.js

A private production workspace for 3.21 Consultancy, migrated from the existing Sites app to **Next.js 16 App Router**, React, SQLite and Better Auth. It runs directly on Node or in Docker. There is no Sites, Cloudflare D1, Vinext or ChatGPT sign-in dependency.

## Start locally

Requires Node.js 22.13+ and npm. From this directory:

```sh
npm ci
npm run setup -- --email you@example.com --name "Your name"
npm run seed
npm run dev
```

Setup creates a random authentication secret in `.env`, initializes the database, and creates a pending owner membership. Open the private `/activate#…` link printed by setup to choose your own password. Then sign in at **http://localhost:3000**. The owner email is the one supplied to setup; it does not need to be a ChatGPT email. If it is already configured, use the existing owner email or the recovery command below. There are no default passwords or automatic visitor accounts.

The demo seed is optional and repeat-safe: 3 fictional clients, 4 productions and 10 videos, labeled DEMO. Links and approvals are examples. It does not invite people or overwrite edited records. These are recreated demo records, not a transfer of the live hosted database.

For a production-mode local server:

```sh
npm run build
npm start
```

The default scripts listen only on loopback. `BETTER_AUTH_URL` must match the browser's exact origin. Use `localhost`, not `127.0.0.1`, with the default configuration.

## Team accounts

1. Sign in as owner and open **Administration → Team access**.
2. Save a teammate's email, name and role.
3. Generate **Account setup link** and share it privately with that person. No email is sent automatically.
4. They choose a password and sign in. Assign videos to their member identity in the video Brief & assignment tab.

Links expire after 24 hours and work once. Generating another link invalidates the previous link for that person. **Recovery link** lets an existing member choose a new password and signs out their old sessions when used. Only the owner can issue links. The server operator can recover an owner account with:

```sh
npm run account:reset -- --email you@example.com
```

The owner manages memberships. Jace/reviewer can approve internal cuts and captions. Admin manages studios, assignments, deadlines, client decisions and publishing. Editors see only assigned videos and their related studio resources; payment information is redacted, and approval, assignment and publishing changes are rejected by the server. Revocation invalidates sessions and outstanding account links. A free-text editor label never grants access.

## Preserved studio features

- Client → Production → Video workspaces, direct client/production links, shared briefs and resource libraries.
- Board and list tracker, search and filters, milestones, calendar, CSV export and archives.
- Draft versions, quality checks, review gates, internal/client/caption approvals, revision notes, final files and posting checks.
- Existing logo and styling; collapsible department groups and a remembered 72px icon sidebar.
- In-app system guide and production SOP, updated for independent sign-in.
- Optimistic concurrency: stale saves fail instead of overwriting another user's work.

This is a tracker/review system. Media editing stays in your editing software; media files stay in your shared drive. The app stores URLs and does not upload/post videos or send messages.

## Docker

Docker Desktop/Engine and Compose are required. Keep `.env` outside version control. To create it and generate its secret, run local setup once as above, or create it from `.env.example` with a unique random secret. Docker uses a separate persistent database volume.

```sh
docker compose build
docker compose run --rm studio npm run setup -- --email you@example.com --name "Your name"
docker compose run --rm studio npm run seed
docker compose up -d
docker compose ps
```

Open the setup link printed by the container command and choose the owner's password. Then open http://localhost:3000. Stop a directly running Node server first if it already uses port 3000.

The image runs as a non-root user. Database and WAL files live in the `studio-data` named volume. Backups live in `studio-backups`. Ordinary `docker compose down` preserves them. **Do not use `down -v` unless you intend to delete all container data.** A health check verifies database availability.

For a server/domain deployment, set `BETTER_AUTH_URL=https://studio.your-domain.com`, retain a strong stable secret, and put an HTTPS reverse proxy in front of the loopback port. If that proxy runs in another container, attach it to the Compose network and use `studio:3000`. The public origin setting controls CSRF checks and secure cookies. No public tunnel or hosted deployment is created by these files.

This SQLite edition is intended for one application instance with a persistent local disk. Do not put its database on an ephemeral serverless filesystem, share it over NFS, or scale replicas against the same file. A future multi-instance deployment would need a shared database adapter.

## Backup and restore

```sh
npm run backup
# or choose a destination:
npm run backup -- backups/before-upgrade.sqlite
```

The online SQLite backup API produces a consistent snapshot including authentication data, team roles, studios and videos. Keep backups private and back up `.env` securely alongside them; authentication secrets are not embedded in database backups.

Restore refuses to overwrite an existing database:

```sh
# Stop the app, then restore to a NEW destination:
DATABASE_PATH=./data/restored.sqlite npm run restore -- /absolute/path/to/backup.sqlite
# Set DATABASE_PATH in .env to that restored file, then restart.
```

Docker equivalents:

```sh
docker compose exec studio npm run backup -- /app/backups/studio.sqlite
docker compose stop studio
docker compose run --rm -e DATABASE_PATH=/app/data/restored.sqlite studio npm run restore -- /app/backups/studio.sqlite
```

After a Docker restore, change the Compose `DATABASE_PATH` to `/app/data/restored.sqlite` before restarting. Do not copy an active `.sqlite` file by itself while WAL writes are in progress.

The existing `../studio` source and live site remain separate. No production records or sharing settings there have been changed by this migration. Before a real cutover, export/import any real work added to that hosted system; its CSV contains tracker fields but is not a complete database backup.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run test:integration
```

Integration tests start an actual production Next.js server on loopback port 3031 with a unique temporary database and synthetic accounts. They cover sign-in, setup/recovery link replay prevention, role isolation, assignments, finance redaction, progress saves, stale writes, approvals, revocation, same-origin protection, demo repeat safety, backup/restore, persistence across restart and sign-out. They do not touch the local working database or the hosted site.

Authentication implementation follows [Better Auth's Next.js integration](https://better-auth.com/docs/integrations/next) and [SQLite setup](https://better-auth.com/docs/installation). Hosting follows [Next.js self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting).

## Editor dashboard and production KPIs

Editors land on **My dashboard**, with their assigned workload, work queue (requested changes first, then earliest deadline), review/footage waiting, and final approvals. **Production KPIs** is available in the Production sidebar and inside each production studio. Managers see all permitted videos; editors see only their own assignments, including in production totals.

The three primary measures are final-approval completion, first drafts on time, and final approvals on time. Each video contributes once. On-time denominators include completed events with dates and overdue unfinished videos; pending future work and missing dates are separately identified. Empty denominators display a dash. Final approval requires the existing workflow gates, including a cover and current approvals. Additional cuts and self-reported quality checks are diagnostics, not a performance score or revision allowance.

First drafts use assignment + 3 calendar days. Final approval uses the current deadline override, otherwise the selected assignment/shoot basis + 7 days. Dates use Asia/Kuala_Lumpur. Final approval timestamps are now recorded by the server when a video enters a valid final state, cleared on reopening, and retained across ordinary edits. Existing completed records without that timestamp remain unmeasured for final timing; no historical completion times are invented. New draft timestamps are server receipt times. Existing draft dates remain recorded history. Deadline changes affect current KPI calculations; this is a current operational scorecard, not a frozen historical appraisal.

All non-archived videos are included, with demo records separated from real records. No arbitrary performance targets or employee rankings are applied. Production elapsed time includes client and reviewer waits; it is not a measure of an editor's working hours. The five-day client rule is not scored because the source guideline uses both client submission and client approval. Metric rules come from the supplied Co-Workers Operation Guideline, with the above calendar-day and deadline-basis conventions made explicit.

## Client logos

Open a client studio → **Edit studio → Client logo** to upload, replace or remove a logo, then **Save studio**. New clients have the same upload control. PNG, JPG and static WebP files up to 2 MB and 16 megapixels are accepted. Logos are re-encoded without metadata and fitted within 512 × 512 pixels, preserving aspect ratio and transparency. SVG and external image URLs are not accepted.

Client cards and studio headers display the logo, with client initials as the fallback. A production header inherits its client's logo. Only the owner, Jace and admin can change logos; assigned editors can view them under the existing studio access rules. The image is stored in the client database record, so existing SQLite backup/restore and Docker data volumes include it. Cancelling the form leaves the saved logo unchanged.

## Full-screen video workspace

Video records open edge to edge with a fixed header, section tabs and save bar. Brief & assignment, Resources, Versions & review, Quality checks, Publishing and Activity use labeled tabs with icons, descriptions and relevant counts. Arrow keys, Home and End navigate the tab bar; the content scrolls separately. Mobile tabs scroll horizontally. Save state is shown in the footer; switching tabs retains the current draft. Client and production settings keep their compact form dialogs.

## Install on a phone

Built and maintained by **AGA Ventures**. Open **Install app on your phone** in the workspace header or **Install on your phone** on the sign-in screen. The `/install` page provides installation instructions and a native install button when the browser offers one.

- **iPhone/iPad:** open the deployed HTTPS URL in Safari → Share → Add to Home Screen. Keep Open as Web App enabled if shown.
- **Android:** open the HTTPS URL in Chrome → Install Three.21 Studio, or ⋮ → Add to Home screen → Install.
- The installed app has a branded home-screen icon, its own window, and the same role-based login. Browser install prompts depend on platform support and eligibility; the page includes manual instructions.
- Phone access needs a reachable **HTTPS deployment**. `localhost:3000` on your phone is not your computer. A GitHub push does not deploy this Node/SQLite application; use the Docker/self-hosting instructions above with an HTTPS domain.
- An internet connection is required for work. The service worker only caches public icons and a generic offline page; authenticated pages, API responses and video records are never added to its cache. Offline edits are not queued. Existing unsaved form values are only in browser memory.
- Icons are derived from the supplied logo. Regenerate platform sizes with `node scripts/generate-icons.mjs` after replacing `public/logo.png`.

The repository contains source and fictional seed data, not the private company research, local database, test account credentials, environment secrets or backups. A new installation needs its own owner setup and team invitations.

Implementation reference: [Next.js progressive web app guide](https://nextjs.org/docs/app/guides/progressive-web-apps).
