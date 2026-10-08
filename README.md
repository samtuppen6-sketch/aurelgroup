# Aurel Group · Sales Pro | Commercial Growth Intelligence

**Aurel Group / Aurel Intelligence** is a business growth and transformation consultancy. We identify hidden commercial value, build an evidence-led financial case, and deliver improvements that **increase revenue, reduce unnecessary operating costs and give people time back**. Technology and AI are tools to achieve those outcomes—not the consultancy's product or identity.

**Brand position:** AI Consulting | Business Streamlined  
**Brand phrase:** Automate. Accelerate. Intelligent Growth.  
**Commercial message:** Increase revenue. Reduce operating costs. Give your people time back.  
**Website:** https://aurelgroup.ai

**What this repository contains:** Aurel Sales Pro, the separate *internal business-development system* supporting the consultancy. Its prospecting, evidence, approvals, CRM, replies, To-Dos and audit-to-contract pipeline do not define Aurel's service offering. It is intended for multiple industries; **UK hospitality groups are the initial discovery campaign**, not a permanent sector restriction.

## Commercial delivery model

1. **Paid opportunity and systems audits** — investigate revenue leakage, growth potential, inefficient processes and realistic financial returns.
2. **Paid pilots** — demonstrate measurable business benefits in a controlled implementation.
3. **Implementation programmes** — deliver agreed improvements in systems, operations, reporting and revenue performance.
4. **Recurring consultancy and optimisation** — maintain, monitor, improve and identify new opportunities.

All prospect hypotheses require sourced evidence and human assessment. Do not imply unverified customer results, guaranteed savings or a deployed production system.


**Status: source-code MVP, NOT a deployed or production-verified live system.** A separate Aurel Supabase project, initial schema and four Edge Functions now exist. No prospect data has been imported, no email has been sent, and Cloudflare hosting, login and integrations have not yet been verified. Do not publish a working URL until the deployment checklist has passed.

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
- The private GitHub repository is ready and a dedicated London Supabase backend has been provisioned. Cloudflare hosting, Gmail and actual logged-in access are not yet verified. Existing Rebase and LandBank production infrastructure was NOT changed.
- Hotel group initial focus. Extend SIC and discovery sources only after reviewing resulting quality; never auto-claim company revenue, transformation ROI or current system software without evidence.
- The Companies House API is UK-only and many registered hotel entities are management/operating companies or have similar names. Human qualification is mandatory.
- This is a functional MVP and still requires a pre-launch security review, privacy notice, send-volume/rate limiting verification and end-to-end OAuth testing before production use.

## Provision and deploy

**1. Private GitHub repository**: Source is maintained in `samtuppen6-sketch/aurelgroup`. Keep this repository private and entirely separate from LandBank and Rebase. Preserve all directories (`public/`, `supabase/`, `.github/workflows/`, `tests/`).

**2. Supabase project — created**: Dedicated Aurel project `kfgjlupwiirmaoatgeid` in London (`eu-west-2`). Migrations `20261008141223_aurel_sales_pro_initial.sql` and `20261008141435_aurel_security_hardening.sql` have been applied. All 12 Aurel business tables have RLS enabled. Do not re-run these migrations manually or apply them to existing other companies' databases; negative-access and end-to-end login tests remain pending.

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

**6. Cloudflare Pages — pending**: Create a NEW Pages project using private GitHub repository `samtuppen6-sketch/aurelgroup` and production branch `main`. Framework preset: None. Build command: none (leave blank). Root directory: `/`; output directory: `public`. The tracked `public/config.js` already contains this project's URL and safe browser **publishable** key. Never place service-role credentials or OAuth tokens in `public/`. Set custom hostname such as `sales.aurelgroup.ai` only when DNS and Supabase Auth redirects are configured.

**7. GitHub Actions scheduled sync**: Add repository secrets `AUREL_SUPABASE_FUNCTIONS_URL=https://PROJECT_REF.supabase.co/functions/v1` and the same `AUREL_JOB_KEY`. Enable GitHub Actions. Then switch on discovery in Aurel Sales Pro Settings only after Companies House credentials are configured. The schedule is UTC (07:30 UK winter / 08:30 British Summer Time), Monday–Friday. The worker prevents a second import for the same UK date. Manual runs are allowed and do not send emails. Reply sync can also be triggered from the UI.

**8. Gmail and approvals**: Connect the **actual** `sam@aurelgroup.ai` mailbox via OAuth, providing refresh-token credentials for that mailbox. The mailer refuses to send if Gmail `users.me.profile.emailAddress` does not exactly match `sam@aurelgroup.ai`. Sign in as director; approve an individual email draft. Confirm the sender account, suppression logic, reply matching, and daily cap before flipping the outbound feature switch in Settings. Each approved email still requires a separate, explicit manual Send click.

## Release gate (must pass before claiming live)

- [x] Dedicated Supabase project, schema migrations installed, and RLS enabled for all 12 tables.
- [ ] Auth membership, real login and negative-access test.
- [x] Separate private GitHub repository; browser publishable-key configuration.
- [ ] Cloudflare Pages project, live login redirects and private-to-live smoke tests.
- [ ] Companies House source key test; real researched UK hospitality leads appear and deduplicate.
- [ ] Aurel-only Gmail OAuth identity test; never use LandBank or Rebase inbox credentials.
- [ ] Approved-test-email send, provider-message receipt, inbound reply creation and one linked To-Do task.
- [ ] UK PECR/GDPR processes: corporate status, suppression/opt-out, source, legitimate interests, privacy notice and record retention policy.
- [ ] GitHub Action schedule and secrets; weekday 15/day cap; failed runs visible.
- [ ] Mobile testing, duplicate-click testing, Cloudflare smoke test, error monitoring, backup and recovery.

## Local inspection

Run `python3 -m http.server 8765 --directory public` then browse `http://localhost:8765` to view configuration state. With a blank new project you cannot sign in until credentials are supplied; this is intentional. Source JS syntax test: `node --check public/app.js`.
