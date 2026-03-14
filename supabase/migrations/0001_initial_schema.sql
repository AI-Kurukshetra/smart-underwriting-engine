create extension if not exists "pgcrypto";

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'underwriter',
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  product_type text not null,
  status text not null default 'submitted',
  requested_amount numeric(12, 2) not null,
  annual_income numeric(12, 2) not null,
  credit_score integer,
  employment_months integer,
  monthly_debt numeric(12, 2) not null default 0,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists application_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  storage_path text not null,
  document_type text not null,
  extraction_status text not null default 'pending',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists risk_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  model_version text not null,
  total_score numeric(5, 2) not null,
  summary text,
  reason_codes jsonb not null default '[]'::jsonb,
  factor_breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  status text not null,
  rationale text,
  reason_codes jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  actor_id uuid references profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table applications enable row level security;
alter table application_documents enable row level security;
alter table risk_scores enable row level security;
alter table decisions enable row level security;
alter table audit_logs enable row level security;

create policy "tenant members can read their profile"
on profiles for select
using (auth.uid() = id);

create policy "tenant scoped customer access"
on customers for all
using (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
)
with check (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
);

create policy "tenant scoped application access"
on applications for all
using (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
)
with check (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
);

create policy "tenant scoped document access"
on application_documents for all
using (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
)
with check (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
);

create policy "tenant scoped score access"
on risk_scores for all
using (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
)
with check (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
);

create policy "tenant scoped decision access"
on decisions for all
using (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
)
with check (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
);

create policy "tenant scoped audit access"
on audit_logs for all
using (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
)
with check (
  tenant_id in (select tenant_id from profiles where id = auth.uid())
);

