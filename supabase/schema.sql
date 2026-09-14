-- Vividium Direct Sales Engine — run once in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table accounts (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  industry text,
  location text,
  website text,
  potential_products text[] default '{}',
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'target' check (status in ('target','contacted','qualified','dead')),
  source text not null default 'manual' check (source in ('manual','csv','ai')),
  verified boolean not null default false,
  last_activity date,
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  grades text[] default '{}',
  sizes text[] default '{}',
  thicknesses text[] default '{}',
  finishes text[] default '{}',
  availability text,
  notes text,
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  stage text not null default 'requirement'
    check (stage in ('requirement','rfq','quotation','negotiation','won','lost','repeat')),
  products jsonb not null default '[]',   -- [{product, grade, size, thickness, finish, qty, application}]
  value_inr numeric default 0,
  quote_ref text,
  expected_close date,
  next_action text,
  next_action_date date,
  lost_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  type text not null check (type in ('call','email','whatsapp','visit','note')),
  summary text not null,
  at timestamptz not null default now(),
  by_user uuid default auth.uid()
);

-- updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger accounts_updated before update on accounts for each row execute function set_updated_at();
create trigger opportunities_updated before update on opportunities for each row execute function set_updated_at();

-- RLS: any signed-in user has full access (small trusted team)
alter table accounts enable row level security;
alter table contacts enable row level security;
alter table products enable row level security;
alter table opportunities enable row level security;
alter table activities enable row level security;

create policy "team all" on accounts for all to authenticated using (true) with check (true);
create policy "team all" on contacts for all to authenticated using (true) with check (true);
create policy "team all" on products for all to authenticated using (true) with check (true);
create policy "team all" on opportunities for all to authenticated using (true) with check (true);
create policy "team all" on activities for all to authenticated using (true) with check (true);

-- Product catalogue: names/grades confirmed by Vividium. Sizes/thickness/finish
-- deliberately empty — fill from Vividium's real spec sheet, do not invent.
insert into products (name, category, grades) values
  ('Round Stainless Steel Pipe',  'Pipes', '{SS304,SS316,SS316L}'),
  ('Square Stainless Steel Pipe', 'Pipes', '{SS304,SS316,SS316L}'),
  ('Oval Stainless Steel Pipe',   'Pipes', '{SS304,SS316,SS316L}'),
  ('Stainless Steel Coil',        'Coils', '{SS304,SS316,SS316L}');
