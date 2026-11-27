-- ============================================================
-- Esprit Critique — listage des exercices côté étudiant
--
-- La table `exercises` est inaccessible aux étudiants puisqu'elle
-- contient les corrigés. Il leur faut pourtant le titre, le type
-- et l'échéance des exercices qui leur sont affectés, ainsi que
-- l'état de leurs propres tentatives.
--
-- Cette fonction renvoie exactement cela, et rien de plus.
-- ============================================================

create or replace function public.list_exercises_for_student(p_cohort_id uuid)
returns table (
  exercise_assignment_id uuid,
  kind                   public.exercise_kind,
  title                  text,
  brief                  text,
  due_at                 timestamptz,
  max_attempts           integer,
  tentatives_utilisees   integer,
  meilleur_score         numeric,
  bareme                 numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ea.id,
    e.kind,
    e.title,
    e.brief,
    ea.due_at,
    ea.max_attempts,
    coalesce((
      select count(*)::integer
      from public.exercise_attempts a
      where a.exercise_assignment_id = ea.id
        and a.profile_id = auth.uid()
        and a.submitted_at is not null
    ), 0),
    (
      select max(a.score)
      from public.exercise_attempts a
      where a.exercise_assignment_id = ea.id
        and a.profile_id = auth.uid()
        and a.submitted_at is not null
    ),
    (
      select max(a.max_score)
      from public.exercise_attempts a
      where a.exercise_assignment_id = ea.id
        and a.profile_id = auth.uid()
        and a.submitted_at is not null
    )
  from public.exercise_assignments ea
  join public.exercises e on e.id = ea.exercise_id
  where ea.cohort_id = p_cohort_id
    and ea.published_at is not null
    and (public.is_cohort_member(p_cohort_id) or public.owns_cohort(p_cohort_id))
  order by ea.due_at nulls last, e.title;
$$;

grant execute on function public.list_exercises_for_student(uuid) to authenticated;
