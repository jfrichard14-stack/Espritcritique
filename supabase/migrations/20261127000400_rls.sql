-- ============================================================
-- Esprit Critique — Row Level Security
--
-- Règle générale : le cloisonnement est appliqué par Postgres,
-- pas par le code applicatif. Oublier un contrôle dans une
-- page ne suffit donc pas à exposer des données.
--
-- Table `exercises` : aucune politique pour les étudiants.
-- Elle contient les corrigés, ils n'y accèdent jamais.
-- ============================================================

alter table public.profiles             enable row level security;
alter table public.cohorts              enable row level security;
alter table public.cohort_members       enable row level security;
alter table public.resources            enable row level security;
alter table public.assignments          enable row level security;
alter table public.submissions          enable row level security;
alter table public.exercises            enable row level security;
alter table public.exercise_assignments enable row level security;
alter table public.exercise_attempts    enable row level security;

-- ------------------------------------------------------------
-- Interdiction de l'élévation de privilège
--
-- Le rôle ne peut pas être modifié via l'API. Promouvoir un
-- compte formateur se fait avec la clé de service (console
-- Supabase ou action serveur dédiée), jamais depuis le
-- navigateur d'un utilisateur.
-- ------------------------------------------------------------

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Le rôle ne peut pas être modifié via l''API' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_role_verrouille
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

create policy "profil_lecture_propre"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profil_lecture_par_formateur_de_la_cohorte"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.cohort_members m
      join public.cohorts c on c.id = m.cohort_id
      where m.profile_id = public.profiles.id
        and c.owner_id = auth.uid()
    )
  );

create policy "profil_maj_propre"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- cohorts
--
-- Note assumée : les membres lisent la ligne complète, code
-- d'invitation compris. Ce code leur est de toute façon connu
-- (il leur a servi à s'inscrire). Pour empêcher sa réutilisation
-- après la formation, basculer enrolment_open à faux.
-- ------------------------------------------------------------

create policy "cohorte_lecture_proprietaire"
  on public.cohorts for select
  to authenticated
  using (owner_id = auth.uid());

create policy "cohorte_lecture_membre"
  on public.cohorts for select
  to authenticated
  using (public.is_cohort_member(id));

create policy "cohorte_creation_formateur"
  on public.cohorts for insert
  to authenticated
  with check (public.is_formateur() and owner_id = auth.uid());

create policy "cohorte_maj_proprietaire"
  on public.cohorts for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "cohorte_suppression_proprietaire"
  on public.cohorts for delete
  to authenticated
  using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- cohort_members
-- ------------------------------------------------------------

create policy "membre_lecture_propre"
  on public.cohort_members for select
  to authenticated
  using (profile_id = auth.uid());

create policy "membre_lecture_proprietaire_cohorte"
  on public.cohort_members for select
  to authenticated
  using (public.owns_cohort(cohort_id));

-- L'inscription libre passe par public.join_cohort().
-- Cette politique permet au formateur d'inscrire quelqu'un à la main.
create policy "membre_ajout_par_proprietaire"
  on public.cohort_members for insert
  to authenticated
  with check (public.owns_cohort(cohort_id));

create policy "membre_retrait_par_proprietaire"
  on public.cohort_members for delete
  to authenticated
  using (public.owns_cohort(cohort_id));

create policy "membre_desinscription_propre"
  on public.cohort_members for delete
  to authenticated
  using (profile_id = auth.uid());

-- ------------------------------------------------------------
-- resources
-- ------------------------------------------------------------

create policy "ressource_lecture_proprietaire"
  on public.resources for select
  to authenticated
  using (public.owns_cohort(cohort_id));

create policy "ressource_lecture_membre_si_publiee"
  on public.resources for select
  to authenticated
  using (public.is_cohort_member(cohort_id) and published_at is not null);

create policy "ressource_ecriture_proprietaire"
  on public.resources for all
  to authenticated
  using (public.owns_cohort(cohort_id))
  with check (public.owns_cohort(cohort_id) and created_by = auth.uid());

-- ------------------------------------------------------------
-- assignments
-- ------------------------------------------------------------

create policy "devoir_lecture_proprietaire"
  on public.assignments for select
  to authenticated
  using (public.owns_cohort(cohort_id));

create policy "devoir_lecture_membre_si_publie"
  on public.assignments for select
  to authenticated
  using (public.is_cohort_member(cohort_id) and published_at is not null);

create policy "devoir_ecriture_proprietaire"
  on public.assignments for all
  to authenticated
  using (public.owns_cohort(cohort_id))
  with check (public.owns_cohort(cohort_id) and created_by = auth.uid());

-- ------------------------------------------------------------
-- submissions
--
-- Un étudiant ne voit que ses propres dépôts. Jamais ceux des autres.
-- ------------------------------------------------------------

create policy "depot_lecture_propre"
  on public.submissions for select
  to authenticated
  using (profile_id = auth.uid());

create policy "depot_lecture_formateur"
  on public.submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.id = public.submissions.assignment_id
        and public.owns_cohort(a.cohort_id)
    )
  );

create policy "depot_creation_etudiant"
  on public.submissions for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and feedback is null
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and a.published_at is not null
        and public.is_cohort_member(a.cohort_id)
    )
  );

create policy "depot_maj_etudiant"
  on public.submissions for update
  to authenticated
  using (
    profile_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      where a.id = public.submissions.assignment_id
        and (a.due_at is null or now() <= a.due_at or a.late_allowed)
    )
  )
  with check (profile_id = auth.uid());

create policy "depot_maj_formateur"
  on public.submissions for update
  to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.id = public.submissions.assignment_id
        and public.owns_cohort(a.cohort_id)
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = public.submissions.assignment_id
        and public.owns_cohort(a.cohort_id)
    )
  );

create policy "depot_suppression_brouillon"
  on public.submissions for delete
  to authenticated
  using (profile_id = auth.uid() and submitted_at is null);

-- ------------------------------------------------------------
-- exercises — formateur uniquement, sans exception
-- ------------------------------------------------------------

create policy "exercice_proprietaire_seul"
  on public.exercises for all
  to authenticated
  using (owner_id = auth.uid() and public.is_formateur())
  with check (owner_id = auth.uid() and public.is_formateur());

-- ------------------------------------------------------------
-- exercise_assignments
-- ------------------------------------------------------------

create policy "affectation_lecture_proprietaire"
  on public.exercise_assignments for select
  to authenticated
  using (public.owns_cohort(cohort_id));

create policy "affectation_lecture_membre_si_publiee"
  on public.exercise_assignments for select
  to authenticated
  using (public.is_cohort_member(cohort_id) and published_at is not null);

create policy "affectation_ecriture_proprietaire"
  on public.exercise_assignments for all
  to authenticated
  using (public.owns_cohort(cohort_id))
  with check (public.owns_cohort(cohort_id));

-- ------------------------------------------------------------
-- exercise_attempts
--
-- Un étudiant peut créer et modifier un brouillon de tentative
-- (utile pour la cartographie d'argument), mais jamais y inscrire
-- un score : seule public.submit_exercise_attempt() le fait.
-- ------------------------------------------------------------

create policy "tentative_lecture_propre"
  on public.exercise_attempts for select
  to authenticated
  using (profile_id = auth.uid());

create policy "tentative_lecture_formateur"
  on public.exercise_attempts for select
  to authenticated
  using (
    exists (
      select 1 from public.exercise_assignments ea
      where ea.id = public.exercise_attempts.exercise_assignment_id
        and public.owns_cohort(ea.cohort_id)
    )
  );

create policy "tentative_brouillon_creation"
  on public.exercise_attempts for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and score is null
    and max_score is null
    and submitted_at is null
    and exists (
      select 1 from public.exercise_assignments ea
      where ea.id = exercise_assignment_id
        and ea.published_at is not null
        and public.is_cohort_member(ea.cohort_id)
    )
  );

create policy "tentative_brouillon_maj"
  on public.exercise_attempts for update
  to authenticated
  using (profile_id = auth.uid() and submitted_at is null)
  with check (
    profile_id = auth.uid()
    and score is null
    and max_score is null
    and submitted_at is null
  );

create policy "tentative_brouillon_suppression"
  on public.exercise_attempts for delete
  to authenticated
  using (profile_id = auth.uid() and submitted_at is null);

-- ------------------------------------------------------------
-- Droits d'exécution des fonctions
--
-- Les auxiliaires de correction ne sont pas exposés à l'API :
-- ils ne sont appelés que depuis d'autres fonctions.
-- ------------------------------------------------------------

revoke execute on function public.grade_exercise(jsonb, jsonb)        from anon, authenticated;
revoke execute on function public.strip_exercise_answers(jsonb)       from anon, authenticated;
revoke execute on function public.handle_new_user()                   from anon, authenticated;
revoke execute on function public.prevent_role_change()               from anon, authenticated;
revoke execute on function public.touch_updated_at()                  from anon, authenticated;
revoke execute on function public.generate_invite_code()              from anon, authenticated;

grant execute on function public.join_cohort(text)                            to authenticated;
grant execute on function public.get_exercise_for_student(uuid)               to authenticated;
grant execute on function public.submit_exercise_attempt(uuid, jsonb)         to authenticated;
grant execute on function public.is_formateur()                               to authenticated;
grant execute on function public.is_cohort_member(uuid)                       to authenticated;
grant execute on function public.owns_cohort(uuid)                            to authenticated;
grant execute on function public.can_read_cohort(uuid)                        to authenticated;
