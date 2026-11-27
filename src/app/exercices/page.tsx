import type { Metadata } from "next";
import Link from "next/link";
import { Carte, Etiquette, LienBouton, Titre, Vide, dateFr } from "@/components/ui";
import { exigerFormateur } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LIBELLES_TYPE, type TypeExercice } from "@/lib/exercices/schema";

export const metadata: Metadata = { title: "Bibliothèque d'exercices" };

export default async function PageExercices() {
  const profil = await exigerFormateur();
  const supabase = await createSupabaseServerClient();

  const { data: exercices } = await supabase
    .from("exercises")
    .select("id, kind, title, brief, content, updated_at, exercise_assignments(id)")
    .eq("owner_id", profil.id)
    .order("updated_at", { ascending: false });

  return (
    <main id="contenu" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Titre>Bibliothèque d&apos;exercices</Titre>
          <p className="mt-2 max-w-xl text-sm text-encre-douce">
            Les exercices vivent ici indépendamment des formations. Un même
            exercice peut être affecté à plusieurs promotions.
          </p>
        </div>
        <LienBouton href="/exercices/nouveau" variante="principal">
          Nouvel exercice
        </LienBouton>
      </div>

      {!exercices || exercices.length === 0 ? (
        <div className="mt-8">
          <Vide titre="Aucun exercice">
            Créez un premier exercice, puis affectez-le à une formation.
          </Vide>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {exercices.map((exercice) => {
            const contenu = exercice.content as { questions?: unknown[] } | null;
            const nbQuestions = Array.isArray(contenu?.questions)
              ? contenu.questions.length
              : 0;
            const nbAffectations = Array.isArray(exercice.exercise_assignments)
              ? exercice.exercise_assignments.length
              : 0;
            return (
              <li key={exercice.id}>
                <Link href={`/exercices/${exercice.id}`} className="block">
                  <Carte className="p-5 transition-colors hover:border-bordure-forte">
                    <div className="flex flex-wrap items-center gap-3">
                      <Titre niveau={2} className="text-base">
                        {exercice.title}
                      </Titre>
                      <Etiquette>{LIBELLES_TYPE[exercice.kind as TypeExercice]}</Etiquette>
                      <span className="text-xs text-encre-tres-douce">
                        {nbQuestions} question{nbQuestions > 1 ? "s" : ""}
                      </span>
                      <Etiquette ton={nbAffectations > 0 ? "accent" : "neutre"}>
                        {nbAffectations === 0
                          ? "Non affecté"
                          : `${nbAffectations} formation${nbAffectations > 1 ? "s" : ""}`}
                      </Etiquette>
                      <span className="ml-auto text-xs text-encre-tres-douce">
                        modifié le {dateFr(exercice.updated_at)}
                      </span>
                    </div>
                    {exercice.brief && (
                      <p className="mt-2 text-sm text-encre-douce">{exercice.brief}</p>
                    )}
                  </Carte>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
