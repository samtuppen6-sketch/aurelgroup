import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('supabase/migrations/20261008_aurel_sales_pro.sql');
const mail=read('supabase/functions/aurel-mailer/index.ts');
const reply=read('supabase/functions/aurel-replies/index.ts');
const discovery=read('supabase/functions/aurel-discover/index.ts');
const client=read('public/app.js');
let count=0;const check=(desc,test)=>{assert.ok(test,desc);console.log('PASS '+desc);count++};
for(const table of ['members','companies','contacts','research','suppressions','outreach','inbound','tasks','opportunities','activities','discovery_runs','settings']){
 check(`RLS is enabled on aurel_${table}`,sql.includes(`alter table public.aurel_${table} enable row level security`));
}
check('separate Aurel scope',!sql.includes('prospect_records')&&!sql.includes('pallet_prospect_campaigns'));
check('member and edit role checks exist',sql.includes('aurel_is_member()')&&sql.includes('aurel_can_edit()'));
check('RLS viewer cannot mutate CRM data',sql.includes('create policy edit_companies on public.aurel_companies for all to authenticated using (public.aurel_can_edit())'));
check('outbound off by default',sql.includes('"enabled":false,"daily_send_limit":15'));
check('approval constraints enforced',sql.includes('aurel_approval_required')&&sql.includes('aurel_protect_outreach'));
check('outbound requires human approval',mail.includes("o.status!=='approved'")&&mail.includes('o.approved_at'));
check('outbound hard-checks Aurel Gmail mailbox',mail.includes("emailOf(profile.emailAddress??'')!==sender")&&mail.includes("const sender='sam@aurelgroup.ai'"));
check('outbound atomic daily cap',mail.includes("admin.rpc('aurel_claim_send'")&&sql.includes('pg_advisory_xact_lock'));
check('opt-outs are suppressed',reply.includes('aurel_suppressions')&&reply.includes('do_not_contact:true'));
check('inbound replies trigger tasks',sql.includes('create trigger aurel_inbound_task')&&sql.includes("'Respond to inbound email'"));
check('discovery obeys weekday and 15 cap',discovery.includes("['Sat','Sun']")&&discovery.includes('Math.min(15,'));
check('Companies House verified SIC 55100',discovery.includes("new Set(['55100'])")&&discovery.includes('api.company-information.service.gov.uk'));
check('front-end does not hold service-role secrets',!client.includes('SERVICE_ROLE_KEY')&&!client.includes('GMAIL_REFRESH_TOKEN'));
check('frontend contains complete CRM modules', ['dashboard','companies','outreach','tasks','pipeline','calls','research','settings'].every(x=>client.includes(`['${x}'`)));
console.log(`RESULT: ${count}/${count} static verification checks passed.`);
