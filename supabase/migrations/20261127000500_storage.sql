-- ============================================================
-- Esprit Critique — stockage de fichiers
--
-- Deux compartiments, tous deux privés (jamais d'URL publique) :
--
--   resources    {cohort_id}/{resource_id}/{nom_fichier}
--   submissions  {assignment_id}/{profile_id}/{nom_fichier}
--
-- L'arborescence porte le contrôle d'accès : le premier segment
-- du chemin identifie la cohorte ou le devoir, le second
-- l'étudiant. Les politiques ci-dessous s'appuient dessus.
-- ============================================================

-- Conversion tolérante : renvoie NULL au lieu d'échouer si le
-- segment de chemin n'est pas un UUID. Indispensable dans une
-- politique, où une exception bloquerait toute la requête.
create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception
  when others then
    return null;
end;
$$;

revoke execute on function public.try_uuid(text) from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('resources',   'resources',   false, 52428800),   -- 50 Mo
  ('submissions', 'submissions', false, 20971520)    -- 20 Mo
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Compartiment « resources » : supports du formateur
-- ------------------------------------------------------------

create policy "resources_lecture_proprietaire"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resources'
    and public.owns_cohort(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "resources_lecture_membre_si_publiee"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resources'
    and public.is_cohort_member(public.try_uuid((storage.foldername(name))[1]))
    and exists (
      select 1 from public.resources r
      where r.storage_path = storage.objects.name
        and r.published_at is not null
    )
  );

create policy "resources_ecriture_proprietaire"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resources'
    and public.owns_cohort(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "resources_maj_proprietaire"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'resources'
    and public.owns_cohort(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "resources_suppression_proprietaire"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resources'
    and public.owns_cohort(public.try_uuid((storage.foldername(name))[1]))
  );

-- ------------------------------------------------------------
-- Compartiment « submissions » : productions des étudiants
--
-- Un étudiant n'accède qu'au dossier portant son identifiant.
-- ------------------------------------------------------------

create policy "submissions_lecture_propre"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "submissions_lecture_formateur"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and exists (
      select 1 from public.assignments a
      where a.id = public.try_uuid((storage.foldername(storage.objects.name))[1])
        and public.owns_cohort(a.cohort_id)
    )
  );

create policy "submissions_depot_etudiant"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.assignments a
      where a.id = public.try_uuid((storage.foldername(name))[1])
        and a.published_at is not null
        and a.accepts_file
        and public.is_cohort_member(a.cohort_id)
    )
  );

create policy "submissions_remplacement_etudiant"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "submissions_suppression_etudiant"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "submissions_suppression_formateur"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'submissions'
    and exists (
      select 1 from public.assignments a
      where a.id = public.try_uuid((storage.foldername(storage.objects.name))[1])
        and public.owns_cohort(a.cohort_id)
    )
  );
