-- =====================================================
-- ARCS
-- =====================================================

create table arc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text check (status in ('active','compressed')) default 'active',
  scope text check (scope in ('personal','project_spanning')) default 'personal',
  confidence_score numeric,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_signal_at timestamptz
);

create index arc_user_idx on arc(user_id);


-- =====================================================
-- ARC ↔ PROJECT LINK
-- =====================================================

create table arc_project_link (
  id uuid primary key default gen_random_uuid(),
  arc_id uuid references arc(id) on delete cascade,
  project_id uuid not null,
  link_strength numeric,
  first_linked_at timestamptz default now(),
  last_linked_at timestamptz default now()
);

create index apl_arc_idx on arc_project_link(arc_id);
create index apl_project_idx on arc_project_link(project_id);


-- =====================================================
-- PHASE
-- =====================================================

create table phase (
  id uuid primary key default gen_random_uuid(),
  arc_id uuid references arc(id) on delete cascade,
  phase_index integer not null,
  status text check (status in ('active','dormant')) default 'active',
  summary text,
  confidence_score numeric,
  started_at timestamptz,
  last_signal_at timestamptz,
  created_at timestamptz default now()
);

create index phase_arc_idx on phase(arc_id);


-- =====================================================
-- PULSE
-- =====================================================

create table pulse (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text check (scope in ('project','global')),
  pulse_type text check (
    pulse_type in ('tension','arc_shift','structural_threshold')
  ),
  headline text,
  project_id uuid,
  occurred_at timestamptz default now(),
  state_hash text not null
);

create index pulse_user_idx on pulse(user_id);
create index pulse_scope_idx on pulse(scope);


-- =====================================================
-- SNAPSHOT STATE
-- =====================================================

create table snapshot_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text check (scope in ('project','global')),
  project_id uuid,
  state_hash text not null,
  snapshot_text text,
  field_note_text text,
  generated_at timestamptz default now()
);

create index snapshot_user_idx on snapshot_state(user_id);
create index snapshot_scope_idx on snapshot_state(scope);


-- =====================================================
-- OPTIONAL: INTERNAL TENSION EDGE (not surfaced)
-- =====================================================

create table tension_edge (
  id uuid primary key default gen_random_uuid(),
  arc_a uuid references arc(id),
  arc_b uuid references arc(id),
  friction_score numeric,
  last_evaluated_at timestamptz default now()
);