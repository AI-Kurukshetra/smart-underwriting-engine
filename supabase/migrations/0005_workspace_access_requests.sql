-- Workspace access requests: users can request to join an existing workspace
-- Admin approves by creating an invite, or rejects the request
create table if not exists workspace_access_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  full_name text,
  status text not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_access_requests_tenant on workspace_access_requests(tenant_id);
create index if not exists idx_workspace_access_requests_status on workspace_access_requests(status);
create unique index if not exists idx_workspace_access_requests_pending on workspace_access_requests(tenant_id, email) where status = 'pending';

alter table workspace_access_requests enable row level security;
