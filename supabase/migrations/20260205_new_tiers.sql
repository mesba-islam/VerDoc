-- New tier architecture (Free / Pro / Power)

-- 1) Columns for export gating and feature flags
alter table if exists subscription_plans
  add column if not exists doc_export_limit integer,
  add column if not exists premium_templates boolean default false,
  add column if not exists archive_access boolean default false;

-- 2) Export usage tracking
create table if not exists export_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id),
  summary_id uuid references summaries(id),
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists export_usage_user_created_idx on export_usage(user_id, created_at desc);

-- 3) Seed / upsert plans (replace Paddle price IDs before running in production)
-- Upsert paid plans by paddle_price_id (keeps existing UUID ids)
insert into subscription_plans (name, upload_limit_mb, transcription_mins, summarization_limit,
                                billing_interval, paddle_price_id, price,
                                doc_export_limit, premium_templates, archive_access)
values
  ('Pro',    1500, 600,  null, 'month', 'pri_01jq50z2qf8v3wh67p9e0rz448',  12,  null, true,  true),
  ('Pro',    1500, 600,  null, 'year',  'pri_01jr6f6maax81nhbahvvnvhezs', 120,  null, true,  true),
  ('Power',  1500, 1800, null, 'month', 'pri_01jr6fbcdgw0z1mxcdapz6d5tr', 24,   null, true,  true),
  ('Power',  1500, 1800, null, 'year',  'pri_01jr6fexccmt98vznh81tsbszg', 240,  null, true,  true)
on conflict (paddle_price_id) do update set
  name              = excluded.name,
  upload_limit_mb   = excluded.upload_limit_mb,
  transcription_mins= excluded.transcription_mins,
  summarization_limit=excluded.summarization_limit,
  billing_interval  = excluded.billing_interval,
  price             = excluded.price,
  doc_export_limit  = excluded.doc_export_limit,
  premium_templates = excluded.premium_templates,
  archive_access    = excluded.archive_access;

-- Ensure Free plan exists (match by name since it has no Paddle price id)
insert into subscription_plans (name, upload_limit_mb, transcription_mins, summarization_limit,
                                billing_interval, paddle_price_id, price,
                                doc_export_limit, premium_templates, archive_access)
select 'Free', 200, 120, 3, 'month', null, 0, 3, false, false
where not exists (
  select 1 from subscription_plans where name = 'Free'
);

update subscription_plans
set upload_limit_mb   = 200,
    transcription_mins= 120,
    summarization_limit = 3,
    billing_interval  = 'month',
    price             = 0,
    doc_export_limit  = 3,
    premium_templates = false,
    archive_access    = false
where name = 'Free';
