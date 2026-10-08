-- Standalone Aurel Sales Pro database. Apply ONLY to a NEW Aurel Supabase project.
-- Never run this migration against LandBank or Rebase.
create extension if not exists pgcrypto;

create table public.aurel_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'analyst' check (role in ('director','admin','analyst','viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.aurel_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.aurel_members m where m.user_id = (select auth.uid()));
$$;
create or replace function public.aurel_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.aurel_members m where m.user_id = (select auth.uid()) and m.role in ('admin','director'));
$$;
create or replace function public.aurel_can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.aurel_members m where m.user_id = (select auth.uid()) and m.role in ('admin','director','analyst'));
$$;
revoke all on function public.aurel_is_member(), public.aurel_is_admin(), public.aurel_can_edit() from public, anon;
grant execute on function public.aurel_is_member(), public.aurel_is_admin(), public.aurel_can_edit() to authenticated, service_role;

create table public.aurel_companies (
 id uuid primary key default gen_random_uuid(),
 legal_name text not null,
 trading_name text,
 company_number text unique,
 company_type text not null default 'unknown' check (company_type in ('limited','llp','sole_trader','partnership','unknown')),
 website text,
 sector text not null default 'hospitality',
 location text,
 source text,
 source_url text,
 status text not null default 'discovered' check (status in ('discovered','researching','qualified','contacted','engaged','disqualified')),
 fit_score integer not null default 0 check (fit_score between 0 and 100),
 opportunity_hypothesis text,
 notes text,
 do_not_contact boolean not null default false,
 next_action_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index aurel_companies_stage_score on public.aurel_companies(status,fit_score desc);

create table public.aurel_contacts (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.aurel_companies(id) on delete cascade,
 full_name text not null,
 job_title text,
 email text,
 phone text,
 decision_maker boolean not null default false,
 email_status text not null default 'unverified' check (email_status in ('unverified','verified','bounced','invalid')),
 lawful_basis text not null default 'unassessed' check (lawful_basis in ('unassessed','corporate_b2b','consent')),
 evidence_url text,
 consent_at timestamptz,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint aurel_email_format check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 constraint aurel_consent_verified check (lawful_basis <> 'consent' or consent_at is not null)
);
create index aurel_contacts_company on public.aurel_contacts(company_id);
create unique index aurel_contact_unique_email on public.aurel_contacts(lower(email)) where email is not null;

create table public.aurel_research (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.aurel_companies(id) on delete cascade,
 claim text not null,
 evidence_url text not null,
 evidence_type text not null default 'public_web',
 verified boolean not null default false,
 discovered_at timestamptz not null default now(),
 checked_at timestamptz,
 created_by uuid references auth.users(id)
);
create index aurel_research_company on public.aurel_research(company_id);

create table public.aurel_suppressions (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 reason text not null,
 created_at timestamptz not null default now(),
 unique(email)
);

create table public.aurel_outreach (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.aurel_companies(id) on delete cascade,
 contact_id uuid not null references public.aurel_contacts(id),
 subject text not null,
 body text not null,
 status text not null default 'draft' check (status in ('draft','approved','sending','sent','replied','failed','cancelled')),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 sent_at timestamptz,
 provider_message_id text unique,
 provider_thread_id text,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint aurel_approval_required check (status not in ('approved','sending','sent','replied') or (approved_by is not null and approved_at is not null))
);
create index aurel_outreach_status on public.aurel_outreach(status,created_at desc);
create index aurel_outreach_thread on public.aurel_outreach(provider_thread_id) where provider_thread_id is not null;

create table public.aurel_inbound (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.aurel_companies(id),
 contact_id uuid references public.aurel_contacts(id),
 outreach_id uuid not null references public.aurel_outreach(id),
 provider_message_id text not null unique,
 provider_thread_id text,
 sender_email text not null,
 subject text,
 excerpt text,
 received_at timestamptz not null default now()
);

create table public.aurel_tasks (
 id uuid primary key default gen_random_uuid(),
 company_id uuid references public.aurel_companies(id),
 contact_id uuid references public.aurel_contacts(id),
 outreach_id uuid references public.aurel_outreach(id),
 inbound_id uuid unique references public.aurel_inbound(id),
 title text not null,
 description text,
 priority text not null default 'normal' check (priority in ('low','normal','high')),
 status text not null default 'open' check (status in ('open','doing','done','cancelled')),
 due_at timestamptz,
 assigned_to uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index aurel_tasks_open on public.aurel_tasks(status,due_at);

create table public.aurel_opportunities (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.aurel_companies(id),
 contact_id uuid references public.aurel_contacts(id),
 title text not null,
 stage text not null default 'discovery' check (stage in ('discovery','call_booked','audit_proposed','audit_won','auditing','pilot_proposed','pilot_running','contract_proposed','contract_won','lost')),
 estimated_audit_gbp numeric(12,2) not null default 0,
 estimated_project_gbp numeric(12,2) not null default 0,
 estimated_monthly_gbp numeric(12,2) not null default 0,
 call_at timestamptz,
 meeting_link text,
 next_action text,
 next_action_at timestamptz,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index aurel_opportunities_stage on public.aurel_opportunities(stage);

create table public.aurel_activities (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.aurel_companies(id),
 contact_id uuid references public.aurel_contacts(id),
 opportunity_id uuid references public.aurel_opportunities(id),
 activity_type text not null check (activity_type in ('note','call','meeting','research','email','status')),
 details text not null,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);

create table public.aurel_discovery_runs (
 id uuid primary key default gen_random_uuid(),
 run_date date not null unique,
 source text not null default 'companies_house',
 target integer not null default 15,
 added integer not null default 0,
 status text not null default 'pending',
 details jsonb not null default '{}'::jsonb,
 started_at timestamptz not null default now(),
 finished_at timestamptz
);

create table public.aurel_settings (
 key text primary key,
 value jsonb not null,
 updated_at timestamptz not null default now()
);
insert into public.aurel_settings(key,value) values
 ('outreach', '{"mode":"approval_gated","sender_email":"sam@aurelgroup.ai","enabled":false,"daily_send_limit":15}'::jsonb),
 ('discovery', '{"target_per_workday":15,"country":"United Kingdom","sector":"hospitality","enabled":false}'::jsonb);

create or replace function public.aurel_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger au_company before update on public.aurel_companies for each row execute function public.aurel_updated_at();
create trigger au_contact before update on public.aurel_contacts for each row execute function public.aurel_updated_at();
create trigger au_outreach before update on public.aurel_outreach for each row execute function public.aurel_updated_at();
create trigger au_task before update on public.aurel_tasks for each row execute function public.aurel_updated_at();
create trigger au_opportunity before update on public.aurel_opportunities for each row execute function public.aurel_updated_at();

-- Ensure an inbound reply always creates one actionable task and closes the outreach loop.
create or replace function public.aurel_handle_reply() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.aurel_outreach set status='replied'
 where id = new.outreach_id and status in ('sent','replied');
 update public.aurel_companies set status='engaged',next_action_at=now()
 where id = new.company_id and status not in ('disqualified');
 insert into public.aurel_tasks(company_id,contact_id,outreach_id,inbound_id,title,description,priority,due_at)
 values (new.company_id,new.contact_id,new.outreach_id,new.id,'Respond to inbound email',concat_ws(E'\n',new.sender_email,new.subject,new.excerpt),'high',now());
 return new;
end $$;
create trigger aurel_inbound_task after insert on public.aurel_inbound for each row execute function public.aurel_handle_reply();

-- Only a secure Edge Function using the service role may record mail as sending/sent/replied.
create or replace function public.aurel_protect_outreach() returns trigger
language plpgsql as $$
begin
 if current_user not in ('service_role','postgres') then
   if tg_op = 'UPDATE' then
     if old.status in ('sending','sent','replied') then
       raise exception 'Delivery and reply events are immutable for browser clients';
     end if;
     if old.status = 'approved' and (
       new.status not in ('approved','cancelled') or
       new.subject is distinct from old.subject or new.body is distinct from old.body or
       new.company_id is distinct from old.company_id or new.contact_id is distinct from old.contact_id or
       new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at
     ) then
       raise exception 'Approved content is immutable; cancel and create a new draft';
     end if;
     if old.status = 'draft' and new.status not in ('draft','approved','cancelled') then
       raise exception 'Invalid draft transition';
     end if;
   end if;
   if new.status in ('sending','sent','replied') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
     raise exception 'Sending and reply states are server-managed';
   end if;
   if new.status = 'approved' and (select not public.aurel_is_admin()) then
     raise exception 'Only directors/admins may approve';
   end if;
   if new.status = 'approved' then
     if new.approved_by is distinct from auth.uid() or new.approved_at is null then
       raise exception 'Approval must identify the authenticated approver';
     end if;
   end if;
 end if;
 return new;
end $$;
create trigger au_outreach_protect before insert or update on public.aurel_outreach for each row execute function public.aurel_protect_outreach();

alter table public.aurel_members enable row level security;
alter table public.aurel_companies enable row level security;
alter table public.aurel_contacts enable row level security;
alter table public.aurel_research enable row level security;
alter table public.aurel_suppressions enable row level security;
alter table public.aurel_outreach enable row level security;
alter table public.aurel_inbound enable row level security;
alter table public.aurel_tasks enable row level security;
alter table public.aurel_opportunities enable row level security;
alter table public.aurel_activities enable row level security;
alter table public.aurel_discovery_runs enable row level security;
alter table public.aurel_settings enable row level security;

create policy member_read_members on public.aurel_members for select to authenticated using (public.aurel_is_member());
create policy director_manage_members on public.aurel_members for all to authenticated using (public.aurel_is_admin()) with check (public.aurel_is_admin());

-- Internal access only; no anonymous reads, writes, or unrestricted API keys.
create policy read_companies on public.aurel_companies for select to authenticated using (public.aurel_is_member());
create policy edit_companies on public.aurel_companies for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_contacts on public.aurel_contacts for select to authenticated using (public.aurel_is_member());
create policy edit_contacts on public.aurel_contacts for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_research on public.aurel_research for select to authenticated using (public.aurel_is_member());
create policy edit_research on public.aurel_research for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_suppressions on public.aurel_suppressions for select to authenticated using (public.aurel_is_member());
create policy edit_suppressions on public.aurel_suppressions for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_outreach on public.aurel_outreach for select to authenticated using (public.aurel_is_member());
create policy draft_outreach on public.aurel_outreach for insert to authenticated with check (public.aurel_can_edit() and status in ('draft','approved'));
create policy update_outreach on public.aurel_outreach for update to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_inbound on public.aurel_inbound for select to authenticated using (public.aurel_is_member());
-- inbound INSERT only via service role; never trust browser posts as replies.
create policy read_tasks on public.aurel_tasks for select to authenticated using (public.aurel_is_member());
create policy edit_tasks on public.aurel_tasks for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_opps on public.aurel_opportunities for select to authenticated using (public.aurel_is_member());
create policy edit_opps on public.aurel_opportunities for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_activities on public.aurel_activities for select to authenticated using (public.aurel_is_member());
create policy edit_activities on public.aurel_activities for all to authenticated using (public.aurel_can_edit()) with check (public.aurel_can_edit());
create policy read_runs on public.aurel_discovery_runs for select to authenticated using (public.aurel_is_member());
create policy read_settings on public.aurel_settings for select to authenticated using (public.aurel_is_member());
create policy admin_settings on public.aurel_settings for all to authenticated using (public.aurel_is_admin()) with check (public.aurel_is_admin());

-- Atomic manual sender cap: concurrency-safe and service-role only.
create or replace function public.aurel_claim_send(p_id uuid,p_limit integer default 15)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
 v_count integer;
 v_today date := timezone('Europe/London',now())::date;
 v_claimed integer;
begin
 if (select current_user) not in ('service_role','postgres') then
   raise exception 'Internal sender only';
 end if;
 perform pg_advisory_xact_lock(hashtext('aurel_mailer_global_lock'));
 select count(*) into v_count from public.aurel_outreach
 where (status in ('sent','replied') and timezone('Europe/London',sent_at)::date = v_today)
    or (status='sending' and timezone('Europe/London',updated_at)::date = v_today);
 if v_count >= greatest(1,least(15,p_limit)) then return false; end if;
 update public.aurel_outreach set status='sending',last_error=null
 where id=p_id and status='approved';
 get diagnostics v_claimed = row_count;
 return v_claimed=1;
end $$;
revoke all on function public.aurel_claim_send(uuid,integer) from public,anon,authenticated;
grant execute on function public.aurel_claim_send(uuid,integer) to service_role;

-- Browser-client roles receive only permissions that RLS permits.
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.aurel_companies,public.aurel_contacts,public.aurel_research,public.aurel_suppressions,public.aurel_outreach,public.aurel_tasks,public.aurel_opportunities,public.aurel_activities to authenticated;
grant select on public.aurel_members,public.aurel_inbound,public.aurel_discovery_runs,public.aurel_settings to authenticated;
grant insert,update,delete on public.aurel_members,public.aurel_settings to authenticated;
-- No table permissions for anon. Secure service role will perform mail, discovery and reply ingestion.
