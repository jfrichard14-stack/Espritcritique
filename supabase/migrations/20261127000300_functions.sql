-- ============================================================
-- Esprit Critique — fonctions
--
-- 1. Auxiliaires pour les politiques RLS.
-- 2. Inscription à une cohorte par code d'invitation.
-- 3. Lecture expurgée et correction serveur des exercices.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Auxiliaires RLS
--
-- Déclarées `security definer` pour éviter la récursion
-- infinie : une politique sur cohort_members ne peut pas
-- interroger cohort_members en passant par RLS.
-- ------------------------------------------------------------

create or replace function public.is_formateur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'formateur'::public.user_role
  );
$$;

create or replace function public.owns_cohort(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cohorts c
    where c.id = p_cohort_id and c.owner_id = auth.uid()
  );
$$;

create or replace function public.is_cohort_member(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cohort_members m
    where m.cohort_id = p_cohort_id and m.profile_id = auth.uid()
  );
$$;

-- Accès en lecture à une cohorte : son propriétaire ou ses membres.
create or replace function public.can_read_cohort(p_cohort_id uuid)
returns boolean
language sql
stable
as $$
  select public.owns_cohort(p_cohort_id) or public.is_cohort_member(p_cohort_id);
$$;

-- ------------------------------------------------------------
-- 2. Inscription par code d'invitation
--
-- L'étudiant n'a pas le droit de lire les cohortes dont il
-- n'est pas membre : la recherche par code doit donc se faire
-- en `security definer`.
-- ------------------------------------------------------------

create or replace function public.join_cohort(p_invite_code text)
returns table (cohort_id uuid, cohort_name text, deja_membre boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cohort public.cohorts;
  v_existe boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select * into v_cohort
  from public.cohorts c
  where upper(c.invite_code) = upper(trim(p_invite_code));

  if not found then
    raise exception 'Code d''invitation inconnu' using errcode = 'P0002';
  end if;

  if v_cohort.archived_at is not null then
    raise exception 'Cette formation est archivée' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.cohort_members m
    where m.cohort_id = v_cohort.id and m.profile_id = auth.uid()
  ) into v_existe;

  if v_existe then
    return query select v_cohort.id, v_cohort.name, true;
    return;
  end if;

  if not v_cohort.enrolment_open then
    raise exception 'Les inscriptions à cette formation sont closes' using errcode = 'P0001';
  end if;

  insert into public.cohort_members (cohort_id, profile_id)
  values (v_cohort.id, auth.uid());

  return query select v_cohort.id, v_cohort.name, false;
end;
$$;

-- ------------------------------------------------------------
-- 3. Exercices
-- ------------------------------------------------------------

-- Retire des énoncés tout ce qui révèle le corrigé.
create or replace function public.strip_exercise_answers(p_content jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_set(
    p_content,
    '{questions}',
    coalesce((
      select jsonb_agg(
               (q - 'explanation') ||
               jsonb_build_object(
                 'choices',
                 coalesce((
                   select jsonb_agg(c - 'correct' - 'rationale' order by ord_c)
                   from jsonb_array_elements(coalesce(q -> 'choices', '[]'::jsonb))
                        with ordinality as ch (c, ord_c)
                 ), '[]'::jsonb)
               )
               order by ord_q
             )
      from jsonb_array_elements(coalesce(p_content -> 'questions', '[]'::jsonb))
           with ordinality as qs (q, ord_q)
    ), '[]'::jsonb)
  );
$$;

-- Corrige un jeu de réponses. Fonction pure : aucun accès aux tables.
--
-- Réponses attendues : { "<question_id>": ["<choice_id>", ...] }
-- Une question sans aucun choix marqué `correct` est considérée
-- comme non auto-corrigeable et exclue du barème.
create or replace function public.grade_exercise(p_content jsonb, p_answers jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  q            jsonb;
  v_points     numeric;
  v_attendu    text[];
  v_donne      text[];
  v_brut       jsonb;
  v_juste      boolean;
  v_total      numeric := 0;
  v_obtenu     numeric := 0;
  v_details    jsonb := '[]'::jsonb;
  v_qid        text;
begin
  for q in
    select value from jsonb_array_elements(coalesce(p_content -> 'questions', '[]'::jsonb))
  loop
    v_qid := q ->> 'id';
    v_points := coalesce((q ->> 'points')::numeric, 1);

    -- Identifiants des choix corrects.
    select coalesce(array_agg(distinct c ->> 'id' order by c ->> 'id'), '{}'::text[])
      into v_attendu
      from jsonb_array_elements(coalesce(q -> 'choices', '[]'::jsonb)) as c
     where coalesce((c ->> 'correct')::boolean, false);

    -- Réponses de l'étudiant, tolérantes sur la forme (chaîne ou tableau).
    v_brut := coalesce(p_answers -> v_qid, '[]'::jsonb);
    if jsonb_typeof(v_brut) = 'string' then
      v_brut := jsonb_build_array(v_brut);
    elsif jsonb_typeof(v_brut) <> 'array' then
      v_brut := '[]'::jsonb;
    end if;

    select coalesce(array_agg(distinct v order by v), '{}'::text[])
      into v_donne
      from jsonb_array_elements_text(v_brut) as v;

    if coalesce(array_length(v_attendu, 1), 0) = 0 then
      -- Question ouverte ou mal définie : hors barème.
      v_details := v_details || jsonb_build_object(
        'question_id', v_qid,
        'auto_corrigee', false,
        'points', v_points,
        'obtenu', null,
        'juste', null,
        'attendu', null,
        'donne', to_jsonb(v_donne),
        'explication', q ->> 'explanation'
      );
      continue;
    end if;

    v_total := v_total + v_points;
    v_juste := (v_attendu = v_donne);
    if v_juste then
      v_obtenu := v_obtenu + v_points;
    end if;

    v_details := v_details || jsonb_build_object(
      'question_id', v_qid,
      'auto_corrigee', true,
      'points', v_points,
      'obtenu', case when v_juste then v_points else 0 end,
      'juste', v_juste,
      'attendu', to_jsonb(v_attendu),
      'donne', to_jsonb(v_donne),
      'explication', q ->> 'explanation'
    );
  end loop;

  return jsonb_build_object(
    'score', v_obtenu,
    'max_score', v_total,
    'par_question', v_details
  );
end;
$$;

-- Énoncé expurgé, pour un étudiant membre de la cohorte.
create or replace function public.get_exercise_for_student(p_exercise_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_tentatives integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select ea.id, ea.due_at, ea.published_at, ea.max_attempts, ea.cohort_id,
         e.kind, e.title, e.brief, e.content
    into v_row
    from public.exercise_assignments ea
    join public.exercises e on e.id = ea.exercise_id
   where ea.id = p_exercise_assignment_id;

  if not found then
    raise exception 'Exercice introuvable' using errcode = 'P0002';
  end if;

  if not (public.owns_cohort(v_row.cohort_id) or public.is_cohort_member(v_row.cohort_id)) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  if v_row.published_at is null and not public.owns_cohort(v_row.cohort_id) then
    raise exception 'Exercice non publié' using errcode = '42501';
  end if;

  select count(*) into v_tentatives
    from public.exercise_attempts a
   where a.exercise_assignment_id = p_exercise_assignment_id
     and a.profile_id = auth.uid()
     and a.submitted_at is not null;

  return jsonb_build_object(
    'id', v_row.id,
    'kind', v_row.kind,
    'title', v_row.title,
    'brief', v_row.brief,
    'due_at', v_row.due_at,
    'max_attempts', v_row.max_attempts,
    'tentatives_utilisees', v_tentatives,
    'content', public.strip_exercise_answers(v_row.content)
  );
end;
$$;

-- Enregistre et corrige une tentative.
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

  if v_row.reveal_corrections then
    return v_resultat || jsonb_build_object('attempt_id', v_attempt_id, 'corrections_revelees', true);
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
    'par_question', v_depouille,
    'attempt_id', v_attempt_id,
    'corrections_revelees', false
  );
end;
$$;
