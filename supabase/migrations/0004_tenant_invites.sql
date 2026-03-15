-- Tenant invites: allow admins to invite users to join their organization
create table if not exists tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null default 'underwriter',
  token text not null unique,
  invited_by uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_invites_token on tenant_invites(token);
create index if not exists idx_tenant_invites_tenant_id on tenant_invites(tenant_id);
create index if not exists idx_tenant_invites_email on tenant_invites(email);

alter table tenant_invites enable row level security;

-- Admins can manage invites for their tenant (via service role in API)
-- No RLS policies needed for admin client; API uses service role
