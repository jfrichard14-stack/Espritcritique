import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Carte,
  Etiquette,
  LienBouton,
  Message,
  Titre,
  Vide,
  dateFr,
  tailleFr,
  Bouton,
} from "@/components/ui";
import { CodeInvitation } from "@/components/code-invitation";
import {
  FormulaireDevoir,
  FormulaireRessource,
} from "@/components/formulaires-formations";
import {
  basculerInscriptions,
  basculerPublicationDevoir,
  basculerPublicationRessource,
  supprimerRessource,
} from "@/lib/actions/formations";
import { exigerSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LIBELLES_TYPE, type TypeExercice } from "@/lib/exercices/schema";

export const metadata: Metadata = { title: "Formation" };

export default async function PageCohorte({
  params,
}: {
  params: Promise<{ cohorteId: string }>;
}) {
  const { cohorteId } = await params;
  const profil = await exigerSession(`/formations/${cohorteId}`);
  const supabase = await createSupabaseServerClient();

  const { data: cohorte } = await supabase
    .from("cohorts")
    .select("*")
    .eq("id", cohorteId)
    .maybeSingle();

  // Absence de ligne = cohorte inexistante OU hors de portée de
  // l'utilisateur : les politiques RLS ne distinguent pas les deux,
  // et c'est volontaire.
  if (!cohorte) notFound();

  const estProprietaire = cohorte.owner_id === profil.id;

  return (
    <main id="contenu" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <nav className="text-sm text-encre-douce">
        <Link href="/tableau-de-bord" className="hover:underline">
          Tableau de bord
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{cohorte.name}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Titre>{cohorte.name}</Titre>
          {cohorte.description && (
            <p className="mt-2 max-w-2xl text-sm text-encre-douce">{cohorte.description}</p>
          )}
          {(cohorte.starts_on || cohorte.ends_on) && (
            <p className="mt-2 text-xs text-encre-tres-douce">
              {dateFr(cohorte.starts_on)} → {dateFr(cohorte.ends_on)}
            </p>
          )}
        </div>
      </div>

      {estProprietaire ? (
        <VueFormateur cohorteId={cohorteId} code={cohorte.invite_code} ouvert={cohorte.enrolment_open} />
      ) : (
        <VueEtudiant cohorteId={cohorteId} />
      )}
    </main>
  );
}

/* ============================================================
   Vue du formateur
   ============================================================ */

async function VueFormateur({
  cohorteId,
  code,
  ouvert,
}: {
  cohorteId: string;
  code: string;
  ouvert: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const [{ data: membres }, { data: ressources }, { data: devoirs }, { data: exercices }] =
    await Promise.all([
      supabase
        .from("cohort_members")
        .select("profile_id, joined_at, profiles(full_name)")
        .eq("cohort_id", cohorteId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("resources")
        .select("*")
        .eq("cohort_id", cohorteId)
        .order("created_at", { ascending: false }),
      supabase
        .from("assignments")
        .select("*, submissions(id, submitted_at, feedback)")
        .eq("cohort_id", cohorteId)
        .order("created_at", { ascending: false }),
      supabase
        .from("exercise_assignments")
        .select("id, due_at, published_at, exercises(id, title, kind)")
        .eq("cohort_id", cohorteId),
    ]);

  return (
    <div className="mt-8 space-y-10">
      <section>
        <Titre niveau={2}>Inscription des étudiants</Titre>
        <Carte className="mt-3 p-5">
          <p className="text-sm text-encre-douce">
            Communiquez ce code à vos étudiants. Ils créent un compte, puis le
            saisissent pour accéder à cette formation.
          </p>
          <div className="mt-3">
            <CodeInvitation code={code} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-bordure pt-4">
            <Etiquette ton={ouvert ? "succes" : "neutre"}>
              {ouvert ? "Inscriptions ouvertes" : "Inscriptions closes"}
            </Etiquette>
            <form action={basculerInscriptions.bind(null, cohorteId, !ouvert)}>
              <Bouton type="submit" variante="secondaire">
                {ouvert ? "Clore les inscriptions" : "Réouvrir les inscriptions"}
              </Bouton>
            </form>
            <p className="text-xs text-encre-douce">
              Clore les inscriptions empêche toute nouvelle arrivée sans retirer
              les étudiants déjà inscrits.
            </p>
          </div>
        </Carte>
      </section>

      <section>
        <Titre niveau={2}>
          Étudiants{" "}
          <span className="font-normal text-encre-douce">({membres?.length ?? 0})</span>
        </Titre>
        {!membres || membres.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Personne n'a encore rejoint la formation" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve text-sm">
            {membres.map((membre) => (
              <li key={membre.profile_id} className="flex items-center gap-3 px-4 py-2.5">
                <span>
                  {(membre.profiles as { full_name: string } | null)?.full_name || "Sans nom"}
                </span>
                <span className="ml-auto text-xs text-encre-tres-douce">
                  inscrit le {dateFr(membre.joined_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Titre niveau={2}>Supports</Titre>
        {!ressources || ressources.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Aucun support" >
              Ajoutez un document : il restera en brouillon jusqu&apos;à sa publication.
            </Vide>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {ressources.map((ressource) => (
              <li key={ressource.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-sm font-medium">{ressource.title}</span>
                  <Etiquette ton={ressource.published_at ? "succes" : "alerte"}>
                    {ressource.published_at ? "Publié" : "Brouillon"}
                  </Etiquette>
                  <span className="text-xs text-encre-tres-douce">
                    {ressource.file_name} · {tailleFr(ressource.size_bytes)}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <a
                      href={`/telecharger?c=resources&p=${encodeURIComponent(ressource.storage_path)}`}
                      className="rounded px-2.5 py-1.5 text-sm text-encre-douce hover:bg-fond-enfonce hover:text-encre"
                    >
                      Télécharger
                    </a>
                    <form
                      action={basculerPublicationRessource.bind(
                        null,
                        ressource.id,
                        cohorteId,
                        !ressource.published_at,
                      )}
                    >
                      <Bouton type="submit" variante="discret">
                        {ressource.published_at ? "Dépublier" : "Publier"}
                      </Bouton>
                    </form>
                    <form action={supprimerRessource.bind(null, ressource.id, cohorteId)}>
                      <Bouton type="submit" variante="danger">
                        Supprimer
                      </Bouton>
                    </form>
                  </div>
                </div>
                {ressource.description && (
                  <p className="mt-1 text-sm text-encre-douce">{ressource.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-bordure bg-fond-eleve">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Ajouter un support
          </summary>
          <div className="border-t border-bordure p-5">
            <FormulaireRessource cohorteId={cohorteId} />
          </div>
        </details>
      </section>

      <section>
        <Titre niveau={2}>Devoirs</Titre>
        {!devoirs || devoirs.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Aucun devoir" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {devoirs.map((devoir) => {
              const depots = Array.isArray(devoir.submissions) ? devoir.submissions : [];
              const remis = depots.filter((d) => d.submitted_at).length;
              const aCorriger = depots.filter((d) => d.submitted_at && !d.feedback).length;
              return (
                <li key={devoir.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                  <Link
                    href={`/formations/${cohorteId}/devoirs/${devoir.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {devoir.title}
                  </Link>
                  <Etiquette ton={devoir.published_at ? "succes" : "alerte"}>
                    {devoir.published_at ? "Publié" : "Brouillon"}
                  </Etiquette>
                  {devoir.due_at && (
                    <span className="text-xs text-encre-tres-douce">
                      échéance {dateFr(devoir.due_at, true)}
                    </span>
                  )}
                  <span className="text-xs text-encre-douce">
                    {remis} remis{aCorriger > 0 ? ` · ${aCorriger} à corriger` : ""}
                  </span>
                  <div className="ml-auto">
                    <form
                      action={basculerPublicationDevoir.bind(
                        null,
                        devoir.id,
                        cohorteId,
                        !devoir.published_at,
                      )}
                    >
                      <Bouton type="submit" variante="discret">
                        {devoir.published_at ? "Dépublier" : "Publier"}
                      </Bouton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-bordure bg-fond-eleve">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Créer un devoir
          </summary>
          <div className="border-t border-bordure p-5">
            <FormulaireDevoir cohorteId={cohorteId} />
          </div>
        </details>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Titre niveau={2}>Exercices affectés</Titre>
          <LienBouton href="/exercices">Bibliothèque d&apos;exercices</LienBouton>
        </div>
        {!exercices || exercices.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Aucun exercice affecté">
              Affectez un exercice depuis la bibliothèque.
            </Vide>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {exercices.map((affectation) => {
              const exercice = affectation.exercises as
                | { id: string; title: string; kind: TypeExercice }
                | null;
              return (
                <li key={affectation.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                  <span className="text-sm font-medium">{exercice?.title}</span>
                  <Etiquette>{exercice ? LIBELLES_TYPE[exercice.kind] : "—"}</Etiquette>
                  <Etiquette ton={affectation.published_at ? "succes" : "alerte"}>
                    {affectation.published_at ? "Publié" : "Brouillon"}
                  </Etiquette>
                  {affectation.due_at && (
                    <span className="text-xs text-encre-tres-douce">
                      échéance {dateFr(affectation.due_at, true)}
                    </span>
                  )}
                  <Link
                    href={`/formations/${cohorteId}/exercices/${affectation.id}/resultats`}
                    className="ml-auto text-sm text-accent-encre hover:underline"
                  >
                    Résultats
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   Vue de l'étudiant
   ============================================================ */

async function VueEtudiant({ cohorteId }: { cohorteId: string }) {
  const supabase = await createSupabaseServerClient();

  const [{ data: ressources }, { data: devoirs }, { data: exercices }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, title, description, storage_path, file_name, size_bytes, published_at")
      .eq("cohort_id", cohorteId)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("id, title, due_at, submissions(id, submitted_at, feedback)")
      .eq("cohort_id", cohorteId)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.rpc("list_exercises_for_student", { p_cohort_id: cohorteId }),
  ]);

  return (
    <div className="mt-8 space-y-10">
      <section>
        <Titre niveau={2}>Supports</Titre>
        {!ressources || ressources.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Aucun support disponible pour l'instant" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {ressources.map((ressource) => (
              <li key={ressource.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">{ressource.title}</span>
                  <span className="text-xs text-encre-tres-douce">
                    {ressource.file_name} · {tailleFr(ressource.size_bytes)}
                  </span>
                  <a
                    href={`/telecharger?c=resources&p=${encodeURIComponent(ressource.storage_path)}`}
                    className="ml-auto rounded px-2.5 py-1.5 text-sm text-accent-encre hover:bg-fond-enfonce"
                  >
                    Télécharger
                  </a>
                </div>
                {ressource.description && (
                  <p className="mt-1 text-sm text-encre-douce">{ressource.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Titre niveau={2}>Devoirs</Titre>
        {!devoirs || devoirs.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Aucun devoir pour l'instant" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {devoirs.map((devoir) => {
              const depot = Array.isArray(devoir.submissions) ? devoir.submissions[0] : null;
              const enRetard = devoir.due_at && new Date(devoir.due_at) < new Date();
              return (
                <li key={devoir.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                  <Link
                    href={`/formations/${cohorteId}/devoirs/${devoir.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {devoir.title}
                  </Link>
                  {devoir.due_at && (
                    <span className="text-xs text-encre-tres-douce">
                      {dateFr(devoir.due_at, true)}
                    </span>
                  )}
                  <span className="ml-auto">
                    {depot?.feedback ? (
                      <Etiquette ton="accent">Retour disponible</Etiquette>
                    ) : depot?.submitted_at ? (
                      <Etiquette ton="succes">Remis</Etiquette>
                    ) : depot ? (
                      <Etiquette ton="alerte">Brouillon</Etiquette>
                    ) : (
                      <Etiquette ton={enRetard ? "danger" : "neutre"}>
                        {enRetard ? "Non remis — en retard" : "Non remis"}
                      </Etiquette>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <Titre niveau={2}>Exercices</Titre>
        {!exercices || exercices.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Aucun exercice pour l'instant" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {exercices.map((exercice) => (
              <li
                key={exercice.exercise_assignment_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3"
              >
                <Link
                  href={`/formations/${cohorteId}/exercices/${exercice.exercise_assignment_id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {exercice.title}
                </Link>
                <Etiquette>{LIBELLES_TYPE[exercice.kind as TypeExercice]}</Etiquette>
                {exercice.due_at && (
                  <span className="text-xs text-encre-tres-douce">
                    {dateFr(exercice.due_at, true)}
                  </span>
                )}
                <span className="ml-auto">
                  {exercice.tentatives_utilisees > 0 ? (
                    <Etiquette ton="succes">
                      {exercice.meilleur_score ?? 0} / {exercice.bareme ?? 0}
                    </Etiquette>
                  ) : (
                    <Etiquette>Non commencé</Etiquette>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Message ton="info">
        Vos productions et vos résultats ne sont visibles que par votre
        formateur. Aucun autre étudiant n&apos;y a accès.
      </Message>
    </div>
  );
}
