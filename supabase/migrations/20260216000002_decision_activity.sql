-- Decision activity log for inline edits
create table if not exists decision_activity (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists decision_activity_decision_id_idx on decision_activity(decision_id);
create index if not exists decision_activity_created_at_idx on decision_activity(created_at desc);
