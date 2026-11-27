import type { Metadata } from "next";
import Link from "next/link";
import { Carte, Etiquette, LienBouton, Titre, Vide, dateFr } from "@/components/ui";
import { exigerSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function PageTableauDeBord() {
  const profil = await exigerSession("/tableau-de-bord");
  const supabase = await createSupabaseServerClient();

  const requeteCohortes = supabase
    .from("cohorts")
    .select("id, name, description, starts_on, ends_on, archived_at, enrolment_open, invite_code")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (profil.role === "formateur") {
    requeteCohortes.eq("owner_id", profil.id);
  }

  const { data: cohortes } = await requeteCohortes;

  return (
    <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Titre>
        Bonjour{profil.full_name ? `, ${profil.full_name.split(" ")[0]}` : ""}
      </Titre>
      <p className="mt-2 text-sm text-encre-douce">
        {profil.role === "formateur"
          ? "Vos formations en cours."
          : "Les formations auxquelles vous participez."}
      </p>

      {profil.role === "formateur" ? (
        <SectionFormateur profilId={profil.id} />
      ) : (
        <SectionEtudiant />
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Titre niveau={2}>Formations</Titre>
          {profil.role === "formateur" ? (
            <LienBouton href="/formations/nouvelle" variante="principal">
              Nouvelle formation
            </LienBouton>
          ) : (
            <LienBouton href="/formations/rejoindre" variante="principal">
              Rejoindre avec un code
            </LienBouton>
          )}
        </div>

        {!cohortes || cohortes.length === 0 ? (
          <div className="mt-4">
            <Vide
              titre={
                profil.role === "formateur"
                  ? "Aucune formation créée"
                  : "Aucune formation rejointe"
              }
            >
              {profil.role === "formateur"
                ? "Créez une formation, puis communiquez son code à vos étudiants."
                : "Votre formateur vous a communiqué un code à huit caractères : saisissez-le pour accéder aux supports."}
            </Vide>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {cohortes.map((cohorte) => (
              <li key={cohorte.id}>
                <Link href={`/formations/${cohorte.id}`} className="block">
                  <Carte className="h-full p-5 transition-colors hover:border-bordure-forte">
                    <div className="flex items-start justify-between gap-3">
                      <Titre niveau={2} className="text-base">
                        {cohorte.name}
                      </Titre>
                      {profil.role === "formateur" && (
                        <Etiquette ton={cohorte.enrolment_open ? "succes" : "neutre"}>
                          {cohorte.enrolment_open ? "Inscriptions ouvertes" : "Inscriptions closes"}
                        </Etiquette>
                      )}
                    </div>
                    {cohorte.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-encre-douce">
                        {cohorte.description}
                      </p>
                    )}
                    {(cohorte.starts_on || cohorte.ends_on) && (
                      <p className="mt-3 text-xs text-encre-tres-douce">
                        {dateFr(cohorte.starts_on)} → {dateFr(cohorte.ends_on)}
                      </p>
                    )}
                  </Carte>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

async function SectionFormateur({ profilId }: { profilId: string }) {
  const supabase = await createSupabaseServerClient();

  const { count: aCorriger } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .not("submitted_at", "is", null)
    .is("feedback", null);

  const { count: nbExercices } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", profilId);

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Carte className="p-5">
        <p className="text-sm text-encre-douce">Productions à corriger</p>
        <p className="mt-1 text-2xl font-semibold">{aCorriger ?? 0}</p>
      </Carte>
      <Carte className="p-5">
        <p className="text-sm text-encre-douce">Exercices en bibliothèque</p>
        <p className="mt-1 text-2xl font-semibold">{nbExercices ?? 0}</p>
      </Carte>
    </div>
  );
}

async function SectionEtudiant() {
  const supabase = await createSupabaseServerClient();

  const { data: devoirs } = await supabase
    .from("assignments")
    .select("id, title, due_at, cohort_id, cohorts(name), submissions(id, submitted_at)")
    .not("published_at", "is", null)
    .order("due_at", { ascending: true, nullsFirst: false });

  const aRendre = (devoirs ?? []).filter((d) => {
    const depot = Array.isArray(d.submissions) ? d.submissions[0] : null;
    return !depot?.submitted_at;
  });

  if (aRendre.length === 0) return null;

  return (
    <section className="mt-6">
      <Titre niveau={3}>À rendre</Titre>
      <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
        {aRendre.slice(0, 5).map((devoir) => {
          const enRetard = devoir.due_at && new Date(devoir.due_at) < new Date();
          return (
            <li key={devoir.id}>
              <Link
                href={`/formations/${devoir.cohort_id}/devoirs/${devoir.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-fond-enfonce"
              >
                <span className="font-medium">{devoir.title}</span>
                <span className="text-encre-tres-douce">
                  {(devoir.cohorts as { name: string } | null)?.name}
                </span>
                <span className="ml-auto">
                  {devoir.due_at ? (
                    <Etiquette ton={enRetard ? "danger" : "alerte"}>
                      {enRetard ? "En retard — " : "Pour le "}
                      {dateFr(devoir.due_at, true)}
                    </Etiquette>
                  ) : (
                    <Etiquette>Sans échéance</Etiquette>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
