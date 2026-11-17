# Aurel Group AI — November 2026 positioning and operating plan

Status: **proposed, not deployed**. Keep live email sending disabled and existing website unchanged until reviewed.

## Positioning

**Headline:** Get the repetitive work off your team's desk.

**Subheadline:** Aurel designs and implements practical automations for growing UK businesses — starting with invoice processing and client onboarding. Your people retain control of approvals, exceptions and decisions.

**Primary CTA:** Show me where the time goes
**Secondary CTA:** See the two workflow pilots

Avoid blanket "replace staff" messaging and guaranteed savings. Offer narrower workload relief and measurable outcomes. Reassure prospects that existing accounting/CRM systems can remain in place if technically feasible.

## Two entry offers

### 1. Finance workflow pilot

**Card heading:** Invoices, reconciliations and exceptions — without the re-keying.
**Copy:** Reduce invoice sorting, three-way matching preparation, supplier-statement chasing and administrative handoffs. Keep human approval for payments, supplier changes and exceptions.
**CTA:** Explore finance automation
**Discovery questions:** Monthly invoice volume? Systems used (Sage/Xero/QuickBooks/ERP)? Main delays? Approval owners?
**Pilot deliverable:** One integration/workflow; exception queue; sample accuracy and time baseline; clear rollback and human sign-off.

### 2. Client onboarding pilot

**Card heading:** Faster onboarding. Fewer missing documents.
**Copy:** Track outstanding information, draft timely reminders, route exceptions and give teams a single view of the client journey. Sensitive identity and regulatory decisions stay with authorised people.
**CTA:** Explore onboarding automation
**Discovery questions:** Clients onboarded monthly? Documents needed? Existing case/CRM software? Time spent chasing?
**Pilot deliverable:** Intake checklist, secure status workflow, reminders by approval, audit trail, time-to-complete measurement.

## Homepage structure

1. Hero with concise problem/outcome positioning (not a generic "AI transformation" promise).
2. Two offer cards with a **specific pain, specific workflow, human safeguards, measurable pilot**.
3. "How it works": Observe → baseline → design → small paid pilot → measure → optional roll-out.
4. Evidence and examples: show only verified completed work. Proposals and internal systems clearly labelled as such.
5. Fee model from transparent starting prices or "scope after short discovery", never imply fixed guaranteed ROI.
6. Short contact form — work email, company, first name, which workflow, optional comment; link privacy notice and confirm consent. Do not remove validation, anti-spam protection or server-side handling.
7. FAQ including: "Does this replace people?", "What about data security?", "Does it work with Sage/Xero/your CRM?", "What if automation gets something wrong?".
8. Footer with legitimate trading identity, privacy/contact details and existing premium visual identity.

## Sales copy rules

- One verified vacancy trigger; one researched duty; one operational question; one measured potential benefit.
- First touch generally 75–110 words (excluding signature/opt-out).
- No fabricated internal problems, guarantees, "AI is better than hiring" phrasing, or multiple speculative benefits.
- Personalise to a named decision maker only when verified; generic inbox routes require appropriate routing.
- Follow-up: no more than one relevant reply-free follow-up in the test; stop on refusal, opt-out or bounce.
- Nothing sends automatically. Records must clear corporate-subscriber classification, lawful-basis review, provenance, verification and suppression check.

## 30-day controlled pilot (planning targets, not forecasts)

- **Week 1:** reconciliation of Gmail to CRM; correct reply classification; deadlock analysis; create 30 evidence-backed vacancy signals with 15 in each offer lane; shortlist 10 strongest.
- **Week 2:** build demonstrations on fictional/synthetic data; verify buyers and contacts; human review messages.
- **Week 3:** small compliant controlled test after explicit campaign approval. Track delivered (where verifiable), human reply, positive reply, meetings, qualified opportunity and paid diagnostics by offer.
- **Week 4:** review actual economics; only scale the better offer with evidence of demand. Do not expand lead volume if the first messages do not convert.

## Commercial model toward £50,000 monthly revenue

Illustrative combination: **2 implementations at £15,000 each + 10 retainers at £2,000 each = £50,000 invoiced in a month**. This is not £50,000 recurring revenue or profit, and depends on acquiring and delivering work to clients. A recurring base of £50,000 MRR would require e.g. 25 clients at £2,000 per month. For £100,000+/month, build delivery capacity and a repeatable offer before scaling acquisition.

Suggested test pricing to validate with prospects: paid workflow diagnostic £750–£1,500, tightly scoped pilot £3,000–£7,500, implementation £8,000–£25,000+, support/optimisation £750–£3,000+/month. These are **hypotheses**, not established Aurel prices.

## Existing-site change instructions

This repo contains the separate Sales Pro system. The public website is the **Aurel Transformation** Lovable project `530a85eb-882b-44ed-b3d8-4217a440f962`. A review draft exists in Lovable. Apply this scope to that draft only; preserve brand's restrained black/gold and ivory design, live enquiry persistence and privacy controls. **Do not deploy or publish without checking mobile usability, contact-form submission and factual claims.**

## Sales Pro

The staging schema in Supabase project `kfgjlupwiirmaoatgeid` includes `public.aurel_vacancy_signals` and `public.aurel_outreach_playbooks`; both are member-only read-only tables in the current client configuration. The companion `public/intent.html` and `public/intent.js` form a non-sending internal review UI. Do not claim the current deployed application includes them until the code is deployed, routing/auth tested and a member confirms visibility.

## Items not done

- The public Lovable website has not been edited or republished.
- The GitHub PR is staging, not production.
- The scoring deadlocks and Gmail→CRM discrepancy require tested code repairs.
- No new campaign has been approved or sent.
