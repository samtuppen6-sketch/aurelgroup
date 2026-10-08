# Aurel Sales Pro · standalone UK hospitality outreach CRM

**Status: deployment-ready source package, NOT a deployed live system.** No prospect data has been imported, no email has been sent, and no Aurel Supabase project has yet been provisioned. Do not publish a working URL until the deployment checklist has passed.

This is deliberately a **separate database and codebase** from LandBank and Rebase. The application is mobile friendly, server-backed, and contains **no demo records or fake KPI data**.

## Features implemented

- Cloudflare Pages-compatible static frontend (`public/`): private magic-link login, searchable companies and contact cards, source-backed evidence, editorial qualification, prospect CSV export.
- Manual contact enrichment with explicit email verification, source URLs, company classification and PECR/legal-basis recording. Optional public HTTPS website contact-extraction Edge Function returns **unverified** addresses only.
- Verified Companies House discovery with weekday cap **15 new companies/day**, active status and SIC 55100 checks, duplicate prevention, transparent shortfall rather than fabricated contacts. Source = official UK register; requires Companies House API key and scheduled job activation.
- Separate editable personalised email drafts, human approval, independent manual send action. No automation may send. Dedicated Aurel Gmail sender hard-checked server-side (`sam@aurelgroup.ai`).
- Gmail thread matching (sender verified), idempotent inbound records, automatic high-priority To-Do tasks, stop/opt-out suppression of further outreach.
- Opportunity pipeline: discovery → call booked → paid audit → pilot → contract won or lost, with booking times and indicative audit/project/monthly fees.
- Default-deny RLS and member roles (`director/admin/analyst/viewer`). No anonymous table policies, and **never** expose a Supabase service-role key in frontend code.
- GitHub Actions workflow for weekday discovery and periodic reply sync. Requires newly created Aurel GitHub repository secrets.

## Important constraints

- This build does **not** generate 15 guaranteed qualified email contacts per day. It searches Companies House for up to 15 **unique eligible businesses**; real decision-makers and verified email evidence must be separately researched. Source-specific research/quality beats unsafe guessing.
- Only one manually approved message may be sent by explicit action; **outbound remains disabled by default** until Gmail is connected and sending enabled by a director.
- No live Cloudflare project, repository or Supabase instance has been created through this package. Existing Rebase and LandBank production infrastructure was NOT changed.
- Hotel group initial focus. Extend SIC and discovery sources only after reviewing resulting quality; never auto-claim company revenue, transformation ROI or current system software without evidence.
- The Companies House API is UK-only and many registered hotel entities are management/operating companies or have similar names. Human qualification is mandatory.
- This is a functional MVP and still requires a pre-launch security review, privacy notice, send-volume/rate limiting verification and end-to-end OAuth testing before production use.

## Provision and deploy

**1. Separate GitHub repository**: Create a private repository `aurel-sales-pro` under the correct account/organisation, then upload these files. Do not commit them into `rebase-ops-hub` or `land-bank`. Repo creation is not supported by the GitHub connector currently available to this assistant.

**2. Separate Supabase project**: Create a new project named `aurel-sales-pro`, UK region (`eu-west-2`) in the **organisation you explicitly choose**, after Supabase cost confirmation. Do not apply this migration to an existing project. In the new project, run `supabase/migrations/20261008_aurel_sales_pro.sql`. Check all `public.aurel_*` RLS policies are active before any external access.

**3. First director membership**: Sign up by magic link from the app, then, as a project administrator in SQL Editor, grant access only to the resulting verified Auth user's ID:

```sql
insert into public.aurel_members(user_id, role)
select id,'director' from auth.users where lower(email) = 'sam@aurelgroup.ai'
on conflict (user_id) do update set role='director';
```

You must configure Supabase Auth → URL Configuration → Site URL and redirect allowlist to match the final Cloudflare Pages URL. Disable unrestricted signup as appropriate and require only invited staff. Never rely on a guessed user ID.

**4. Edge Functions**: Deploy `aurel-discover`, `aurel-research`, `aurel-mailer`, `aurel-replies`. Preserve the shared `_shared/common.ts` relative import directory. Functions are intended for the new Aurel project only. For `aurel-mailer`, use JWT verification enabled. For `aurel-discover` and `aurel-replies` with GitHub Actions custom `x-aurel-job-key` authentication, disable gateway JWT verification while retaining the internal JWT-or-secret verification in code. `aurel-research` uses JWT verification enabled. Supabase CLI example, run from repository root:

```bash
supabase link --project-ref YOUR_AUREL_PROJECT_REF
supabase db push
supabase functions deploy aurel-mailer --verify-jwt
supabase functions deploy aurel-research --verify-jwt
supabase functions deploy aurel-discover --no-verify-jwt
supabase functions deploy aurel-replies --no-verify-jwt
```

**5. Server-only secrets** (in new Aurel Supabase Edge Function environment):

```
COMPANIES_HOUSE_API_KEY=...                 # obtained from Companies House developer portal
AUREL_JOB_KEY=...                            # 32+ random cryptographic characters
AUREL_GMAIL_CLIENT_ID=...
AUREL_GMAIL_CLIENT_SECRET=...
AUREL_GMAIL_REFRESH_TOKEN=...                # OAuth token with correct Gmail read/send scopes
```

The runtime automatically provisions `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never put the listed values in GitHub source files or Cloudflare public `config.js`.

**6. Cloudflare Pages**: Create a NEW Pages project for Aurel. Publish directory `public/` with no build step (or GitHub integration with build output `public`). Copy `public/config.example.js` to `public/config.js` and configure the project URL plus **publishable anon key**. Both are safe for browser use provided RLS stays enforced; service-role credentials are never safe to publish. Configure an Aurel-owned hostname such as `sales.aurelgroup.ai` only after adding the relevant DNS record.

**7. GitHub Actions scheduled sync**: Add repository secrets `AUREL_SUPABASE_FUNCTIONS_URL=https://PROJECT_REF.supabase.co/functions/v1` and the same `AUREL_JOB_KEY`. Enable GitHub Actions. Then switch on discovery in Aurel Sales Pro Settings only after Companies House credentials are configured. The schedule is UTC (07:30 UK winter / 08:30 British Summer Time), Monday–Friday. The worker prevents a second import for the same UK date. Manual runs are allowed and do not send emails. Reply sync can also be triggered from the UI.

**8. Gmail and approvals**: Connect the **actual** `sam@aurelgroup.ai` mailbox via OAuth, providing refresh-token credentials for that mailbox. The mailer refuses to send if Gmail `users.me.profile.emailAddress` does not exactly match `sam@aurelgroup.ai`. Sign in as director; approve an individual email draft. Confirm the sender account, suppression logic, reply matching, and daily cap before flipping the outbound feature switch in Settings. Each approved email still requires a separate, explicit manual Send click.

## Release gate (must pass before claiming live)

- [ ] Separate Supabase project, migration success, RLS on every table, auth membership and negative-access test.
- [ ] Separate private repository and Cloudflare Pages project, private-to-live config done.
- [ ] Companies House source key test; real researched UK hospitality leads appear and deduplicate.
- [ ] Aurel-only Gmail OAuth identity test; never use LandBank or Rebase inbox credentials.
- [ ] Approved-test-email send, provider-message receipt, inbound reply creation and one linked To-Do task.
- [ ] UK PECR/GDPR processes: corporate status, suppression/opt-out, source, legitimate interests, privacy notice and record retention policy.
- [ ] GitHub Action schedule and secrets; weekday 15/day cap; failed runs visible.
- [ ] Mobile testing, duplicate-click testing, Cloudflare smoke test, error monitoring, backup and recovery.

## Local inspection

Run `python3 -m http.server 8765 --directory public` then browse `http://localhost:8765` to view configuration state. With a blank new project you cannot sign in until credentials are supplied; this is intentional. Source JS syntax test: `node --check public/app.js`.
