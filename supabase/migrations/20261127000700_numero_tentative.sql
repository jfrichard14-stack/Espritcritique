-- ============================================================
-- Esprit Critique — numéro de tentative dans le résultat
--
-- L'interface ne peut pas déduire le numéro de la tentative en
-- cours à partir du compteur chargé avec l'énoncé : la
-- revalidation déclenchée par la soumission rafraîchit ce
-- compteur, qui inclut alors déjà la tentative soumise.
-- La base renvoie donc le numéro, qu'elle est seule à connaître
-- de façon fiable.
-- ============================================================

create or replace function public.submit_exercise_attempt(
  p_exercise_assignment_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row        record;
  v_tentatives integer;
  v_resultat   jsonb;
  v_attempt_id uuid;
  v_depouille  jsonb;
  v_meta       jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object' then
    raise exception 'Réponses malformées' using errcode = '22023';
  end if;

  select ea.id, ea.due_at, ea.published_at, ea.max_attempts, ea.cohort_id,
         ea.reveal_corrections, e.content
    into v_row
    from public.exercise_assignments ea
    join public.exercises e on e.id = ea.exercise_id
   where ea.id = p_exercise_assignment_id;

  if not found then
    raise exception 'Exercice introuvable' using errcode = 'P0002';
  end if;

  if not public.is_cohort_member(v_row.cohort_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  if v_row.published_at is null then
    raise exception 'Exercice non publié' using errcode = '42501';
  end if;

  select count(*) into v_tentatives
    from public.exercise_attempts a
   where a.exercise_assignment_id = p_exercise_assignment_id
     and a.profile_id = auth.uid()
     and a.submitted_at is not null;

  if v_row.max_attempts is not null and v_tentatives >= v_row.max_attempts then
    raise exception 'Nombre de tentatives épuisé' using errcode = 'P0001';
  end if;

  v_resultat := public.grade_exercise(v_row.content, p_answers);

  insert into public.exercise_attempts
    (exercise_assignment_id, profile_id, answers, score, max_score, submitted_at)
  values
    (p_exercise_assignment_id, auth.uid(), p_answers,
     (v_resultat ->> 'score')::numeric, (v_resultat ->> 'max_score')::numeric, now())
  returning id into v_attempt_id;

  v_meta := jsonb_build_object(
    'attempt_id', v_attempt_id,
    'tentative_numero', v_tentatives + 1,
    'max_attempts', v_row.max_attempts,
    'corrections_revelees', v_row.reveal_corrections
  );

  if v_row.reveal_corrections then
    return v_resultat || v_meta;
  end if;

  -- Score seul : on retire les bonnes réponses et les explications.
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'question_id', d ->> 'question_id',
             'auto_corrigee', d -> 'auto_corrigee',
             'points', d -> 'points',
             'obtenu', d -> 'obtenu',
             'juste', d -> 'juste'
           ) order by ord
         ), '[]'::jsonb)
    into v_depouille
    from jsonb_array_elements(v_resultat -> 'par_question') with ordinality as t (d, ord);

  return jsonb_build_object(
    'score', v_resultat -> 'score',
    'max_score', v_resultat -> 'max_score',
    'par_question', v_depouille
  ) || v_meta;
end;
$$;
