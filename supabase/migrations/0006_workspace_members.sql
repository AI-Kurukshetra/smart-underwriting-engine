-- Multi-workspace support: users can belong to multiple workspaces
create table if not exists workspace_members (
  user_id uuid not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null default 'underwriter',
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index if not exists idx_workspace_members_tenant_id on workspace_members(tenant_id);
create index if not exists idx_workspace_members_user_id on workspace_members(user_id);

-- Backfill: every existing profile becomes a workspace member
insert into workspace_members (user_id, tenant_id, role, created_at)
select id, tenant_id, role, created_at from profiles
on conflict (user_id, tenant_id) do nothing;

alter table workspace_members enable row level security;

create policy "users can read their own memberships"
on workspace_members for select
using (auth.uid() = user_id);

-- Helper: tenant IDs the current user can access (workspace_members is source of truth for access)
create or replace function public.user_tenant_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select tenant_id from public.workspace_members where user_id = auth.uid()
  union
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- Update RLS to include workspace_members
do $$
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where policyname like 'tenant scoped%'
       or policyname = 'tenant members can read their profile'
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Recreate policies with multi-workspace support
create policy "tenant members can read their profile"
on profiles for select
using (auth.uid() = id);

create policy "tenant scoped customer access" on customers for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped application access" on applications for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped document access" on application_documents for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped score access" on risk_scores for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped decision access" on decisions for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped audit access" on audit_logs for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped fraud_alerts" on fraud_alerts for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped risk_factor_configs" on risk_factor_configs for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped compliance_reviews" on compliance_reviews for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped workflow_actions" on workflow_actions for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped model_configs" on model_configs for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped stress_scenarios" on stress_scenarios for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped monitoring_alerts" on monitoring_alerts for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));

create policy "tenant scoped saved_reports" on saved_reports for all
using (tenant_id in (select public.user_tenant_ids()))
with check (tenant_id in (select public.user_tenant_ids()));
