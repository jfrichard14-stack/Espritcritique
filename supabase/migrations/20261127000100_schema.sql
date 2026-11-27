-- ============================================================
-- Esprit Critique — schéma initial
-- Rôles, cohortes, ressources, devoirs, dépôts, exercices.
-- ============================================================

-- ------------------------------------------------------------
-- Utilitaires
-- ------------------------------------------------------------

-- Met à jour automatiquement la colonne updated_at.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Génère un code d'invitation lisible à l'oral.
-- Alphabet volontairement privé des caractères ambigus (0/O, 1/I/L).
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- ------------------------------------------------------------
-- Types
-- ------------------------------------------------------------

create type public.user_role as enum ('formateur', 'etudiant');
create type public.exercise_kind as enum ('qcm', 'drill', 'case_study', 'argument_map');

-- ------------------------------------------------------------
-- Profils
-- Une ligne par compte, créée automatiquement à l'inscription.
-- ------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'etudiant',
  full_name   text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

comment on table public.profiles is
  'Profil applicatif adossé à auth.users. Le rôle détermine les droits.';

-- Création du profil au moment de l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Cohortes
-- ------------------------------------------------------------

create table public.cohorts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete restrict,
  name          text not null check (length(trim(name)) > 0),
  description   text not null default '',
  invite_code   text not null unique default public.generate_invite_code(),
  starts_on     date,
  ends_on       date,
  enrolment_open boolean not null default true,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint cohorts_dates_coherentes check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index cohorts_owner_idx on public.cohorts (owner_id);
create trigger cohorts_touch
  before update on public.cohorts
  for each row execute function public.touch_updated_at();

comment on column public.cohorts.invite_code is
  'Code communiqué aux étudiants pour rejoindre la cohorte après création de leur compte.';

create table public.cohort_members (
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (cohort_id, profile_id)
);

create index cohort_members_profile_idx on public.cohort_members (profile_id);

-- ------------------------------------------------------------
-- Ressources (supports distribués par le formateur)
-- ------------------------------------------------------------

create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  title         text not null check (length(trim(title)) > 0),
  description   text not null default '',
  storage_path  text not null,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint check (size_bytes is null or size_bytes >= 0),
  published_at  timestamptz,
  created_by    uuid not null references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index resources_cohort_idx on public.resources (cohort_id);
create trigger resources_touch
  before update on public.resources
  for each row execute function public.touch_updated_at();

comment on column public.resources.published_at is
  'NULL = brouillon, invisible pour les étudiants.';

-- ------------------------------------------------------------
-- Devoirs et dépôts
-- ------------------------------------------------------------

create table public.assignments (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  title         text not null check (length(trim(title)) > 0),
  instructions  text not null default '',
  due_at        timestamptz,
  accepts_file  boolean not null default true,
  accepts_text  boolean not null default true,
  late_allowed  boolean not null default true,
  published_at  timestamptz,
  created_by    uuid not null references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint assignments_un_mode_au_moins check (accepts_file or accepts_text)
);

create index assignments_cohort_idx on public.assignments (cohort_id);
create trigger assignments_touch
  before update on public.assignments
  for each row execute function public.touch_updated_at();

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  body          text not null default '',
  storage_path  text,
  file_name     text,
  size_bytes    bigint check (size_bytes is null or size_bytes >= 0),
  submitted_at  timestamptz,
  feedback      text,
  feedback_at   timestamptz,
  feedback_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (assignment_id, profile_id)
);

create index submissions_profile_idx on public.submissions (profile_id);
create trigger submissions_touch
  before update on public.submissions
  for each row execute function public.touch_updated_at();

comment on column public.submissions.submitted_at is
  'NULL = brouillon en cours de rédaction, non remis.';
