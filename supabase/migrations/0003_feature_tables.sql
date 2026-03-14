-- Fraud alerts table
create table if not exists fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium',
  description text,
  status text not null default 'open',
  confidence numeric(5, 2) not null default 0,
  notes text,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Risk factor configuration (per-tenant customizable weights)
create table if not exists risk_factor_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  factor_key text not null,
  name text not null,
  category text not null,
  weight numeric(5, 2) not null default 0,
  max_score numeric(5, 2) not null default 100,
  description text,
  enabled boolean not null default true,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, factor_key)
);

-- Compliance reviews (per-check audit of reviews)
create table if not exists compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  check_code text not null,
  status text not null default 'pending',
  reviewed_by uuid references profiles(id),
  notes text,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workflow actions (flag resolutions, escalations)
create table if not exists workflow_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  action_type text not null,
  flag text,
  notes text,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Model configurations (per-tenant model lifecycle)
create table if not exists model_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  model_name text not null,
  model_kind text not null,
  status text not null default 'active',
  coverage text,
  accuracy numeric(5, 2),
  last_trained_at timestamptz,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, model_name)
);

-- Stress test scenarios (including custom user-created ones)
create table if not exists stress_scenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  impact_on_loss_ratio numeric(5, 2) not null default 0,
  impact_on_approval_rate numeric(5, 2) not null default 0,
  affected_applications integer not null default 0,
  severity text not null default 'moderate',
  is_custom boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Monitoring alerts
create table if not exists monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  message text not null,
  severity text not null default 'info',
  acknowledged boolean not null default false,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

-- Saved reports
create table if not exists saved_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  widgets jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on all new tables
alter table fraud_alerts enable row level security;
alter table risk_factor_configs enable row level security;
alter table compliance_reviews enable row level security;
alter table workflow_actions enable row level security;
alter table model_configs enable row level security;
alter table stress_scenarios enable row level security;
alter table monitoring_alerts enable row level security;
alter table saved_reports enable row level security;

-- RLS policies for tenant scoping
create policy "tenant scoped fraud_alerts" on fraud_alerts for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped risk_factor_configs" on risk_factor_configs for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped compliance_reviews" on compliance_reviews for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped workflow_actions" on workflow_actions for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped model_configs" on model_configs for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped stress_scenarios" on stress_scenarios for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped monitoring_alerts" on monitoring_alerts for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "tenant scoped saved_reports" on saved_reports for all
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()))
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid()));
