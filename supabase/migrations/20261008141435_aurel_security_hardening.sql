-- Aurel Sales Pro hardening, 2026-10-08
-- Internal trigger must never be directly callable by anonymous or signed-in API clients.
revoke all on function public.aurel_handle_reply() from public, anon, authenticated;
-- Explicit schema resolution for mutable invoker trigger functions.
alter function public.aurel_updated_at() set search_path = '';
alter function public.aurel_protect_outreach() set search_path = '';
