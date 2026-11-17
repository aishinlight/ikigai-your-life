-- Ikigai Your Life — initial schema
-- Minimal active schema. No booking / coach-notes / email-notification tables by design.
-- `needs_ratings` stores the user's satisfaction estimates for Kamiya's needs (used by /map).
-- `sharing_consents` and `ikigai_maps` are intentionally NOT created: there is no sharing
-- mechanism and no versioned map snapshots.

create extension if not exists pgcrypto;

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── profiles & roles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  coaching_preference text check (coaching_preference in ('ai','human','both','undecided')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.app_role as enum ('client', 'coach', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles(user_id);

-- Role check usable in policies without recursion.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Exactly one profile + default 'client' role for every new auth user.
-- Never grants coach/admin here (no email matching). Elevated roles are granted manually
-- by the owner via SQL using a verified user UUID (see README).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 120), '')
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'client')
  on conflict (user_id, role) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── onboarding ─────────────────────────
create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null check (question_key in
    ('what_brings_you','life_area','understand_better','meaningful_journey','how_to_begin')),
  answer text check (char_length(answer) <= 5000),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_key)
);

-- ───────────────────────── AI coaching ─────────────────────────
create table public.coaching_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null check (module_key in ('aliveness','connection','freedom','meaning')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coaching_conversations_user_module_idx on public.coaching_conversations(user_id, module_key, updated_at desc);

create table public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coaching_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index coaching_messages_conv_idx on public.coaching_messages(conversation_id, created_at);

create table public.ikigai_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null check (module_key in ('aliveness','connection','freedom','meaning')),
  conversation_id uuid references public.coaching_conversations(id) on delete set null,
  key_discoveries jsonb not null default '[]'::jsonb check (jsonb_typeof(key_discoveries) = 'array'),
  recurring_themes jsonb not null default '[]'::jsonb check (jsonb_typeof(recurring_themes) = 'array'),
  supporting_examples jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_examples) = 'array'),
  open_questions jsonb not null default '[]'::jsonb check (jsonb_typeof(open_questions) = 'array'),
  further_exploration jsonb not null default '[]'::jsonb check (jsonb_typeof(further_exploration) = 'array'),
  status text not null default 'draft' check (status in ('draft','confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_key)
);

-- ───────────────────────── map ─────────────────────────
create table public.needs_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  need_key text not null check (need_key in
    ('fulfillment','change_growth','future','response','freedom','self_realization','meaning_value')),
  score smallint not null check (score between 0 and 10),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, need_key)
);

create table public.possible_directions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  description text check (char_length(description) <= 3000),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  source text not null default 'user' check (source in ('ai','user')),
  status text not null default 'suggested' check (status in ('suggested','kept','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index possible_directions_user_idx on public.possible_directions(user_id, created_at desc);

-- ───────────────────────── action plan ─────────────────────────
create table public.action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  chosen_direction text check (char_length(chosen_direction) <= 1000),
  notes text check (char_length(notes) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.action_plans(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  details text check (char_length(details) <= 3000),
  status text not null default 'todo' check (status in ('todo','in_progress','completed','postponed')),
  target_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index action_items_plan_idx on public.action_items(plan_id, position);

-- ───────────────────────── journal ─────────────────────────
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text check (char_length(title) <= 300),
  body text not null check (char_length(body) between 1 and 50000),
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_entries_user_idx on public.journal_entries(user_id, entry_date desc, created_at desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','onboarding_responses','coaching_conversations','ikigai_reflections',
    'needs_ratings','possible_directions','action_plans','action_items','journal_entries']
  loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Touch conversation when a message is added (for "resume latest").
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.coaching_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;
create trigger coaching_messages_touch after insert on public.coaching_messages
  for each row execute function public.touch_conversation();

-- ───────────────────────── Row-level security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.coaching_conversations enable row level security;
alter table public.coaching_messages enable row level security;
alter table public.ikigai_reflections enable row level security;
alter table public.needs_ratings enable row level security;
alter table public.possible_directions enable row level security;
alter table public.action_plans enable row level security;
alter table public.action_items enable row level security;
alter table public.journal_entries enable row level security;

-- profiles: own row only. Insert is done by the trigger; delete cascades from auth.users.
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- user_roles: users may read their own roles; NO insert/update/delete policies → server-controlled only.
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Simple owner tables (full CRUD on own rows). No coach/admin bypass anywhere.
do $$
declare t text;
begin
  foreach t in array array['onboarding_responses','coaching_conversations','ikigai_reflections',
    'needs_ratings','possible_directions','action_plans','journal_entries']
  loop
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Reflections may only reference the user's own conversation.
create policy "ikigai_reflections_conv_owner" on public.ikigai_reflections as restrictive for all to authenticated
  using (true)
  with check (conversation_id is null or exists (
    select 1 from public.coaching_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- coaching_messages: ownership through the parent conversation.
-- Users may insert only their own 'user' messages; assistant messages are written by the
-- edge function with the service role after it has verified ownership.
create policy "coaching_messages_select_own" on public.coaching_messages for select to authenticated
  using (exists (select 1 from public.coaching_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "coaching_messages_insert_own_user" on public.coaching_messages for insert to authenticated
  with check (role = 'user' and exists (
    select 1 from public.coaching_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "coaching_messages_delete_own" on public.coaching_messages for delete to authenticated
  using (exists (select 1 from public.coaching_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- action_items: ownership through the parent plan.
create policy "action_items_all_own" on public.action_items for all to authenticated
  using (exists (select 1 from public.action_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.action_plans p where p.id = plan_id and p.user_id = auth.uid()));

-- Anonymous visitors get nothing from these tables.
revoke all on all tables in schema public from anon;
