-- ============================================================
-- Esprit Critique — exercices
--
-- Un seul couple de tables pour tous les types d'exercices
-- (QCM, drills, études de cas, cartographie d'argument) :
-- la structure propre à chaque type vit dans la colonne jsonb
-- `content`, validée côté application.
--
-- Principe de sécurité : `exercises.content` contient les
-- corrigés. Les étudiants n'ont JAMAIS le droit de lire cette
-- table. Ils passent par public.get_exercise_for_student(),
-- qui renvoie l'énoncé expurgé, et par
-- public.submit_exercise_attempt(), qui corrige côté serveur.
-- ============================================================

create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  kind        public.exercise_kind not null,
  title       text not null check (length(trim(title)) > 0),
  brief       text not null default '',
  content     jsonb not null default '{"questions": []}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint exercises_content_est_objet check (jsonb_typeof(content) = 'object')
);

create index exercises_owner_idx on public.exercises (owner_id);
create trigger exercises_touch
  before update on public.exercises
  for each row execute function public.touch_updated_at();

comment on table public.exercises is
  'Bibliothèque d''exercices du formateur, indépendante des cohortes. Contient les corrigés.';

-- Affectation d'un exercice de la bibliothèque à une cohorte.
create table public.exercise_assignments (
  id            uuid primary key default gen_random_uuid(),
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  due_at        timestamptz,
  published_at  timestamptz,
  max_attempts  integer check (max_attempts is null or max_attempts > 0),
  reveal_corrections boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (exercise_id, cohort_id)
);

create index exercise_assignments_cohort_idx on public.exercise_assignments (cohort_id);
create trigger exercise_assignments_touch
  before update on public.exercise_assignments
  for each row execute function public.touch_updated_at();

comment on column public.exercise_assignments.max_attempts is
  'NULL = nombre de tentatives illimité.';
comment on column public.exercise_assignments.reveal_corrections is
  'Si faux, l''étudiant voit son score mais pas les bonnes réponses.';

create table public.exercise_attempts (
  id                      uuid primary key default gen_random_uuid(),
  exercise_assignment_id  uuid not null references public.exercise_assignments (id) on delete cascade,
  profile_id              uuid not null references public.profiles (id) on delete cascade,
  answers                 jsonb not null default '{}'::jsonb,
  score                   numeric,
  max_score               numeric,
  started_at              timestamptz not null default now(),
  submitted_at            timestamptz,
  constraint attempts_answers_est_objet check (jsonb_typeof(answers) = 'object')
);

create index exercise_attempts_profile_idx
  on public.exercise_attempts (profile_id, exercise_assignment_id);
create index exercise_attempts_assignment_idx
  on public.exercise_attempts (exercise_assignment_id);

comment on table public.exercise_attempts is
  'Une ligne par tentative. Pour la cartographie d''argument, la production
   de l''étudiant est stockée dans `answers`.';
