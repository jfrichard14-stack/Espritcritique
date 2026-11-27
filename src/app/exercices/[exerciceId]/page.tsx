import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Carte, Etiquette, Titre, Vide, dateFr, Bouton } from "@/components/ui";
import { EditeurExercice, type ExerciceInitial } from "@/components/editeur-exercice";
import { FormulaireAffectation } from "@/components/formulaire-affectation";
import { retirerAffectation } from "@/lib/actions/exercices";
import { exigerFormateur } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nouvelIdentifiant, type TypeExercice } from "@/lib/exercices/schema";

export const metadata: Metadata = { title: "Exercice" };

type ChoixBrut = {
  id?: string;
  label?: string;
  correct?: boolean;
  rationale?: string;
};

type QuestionBrute = {
  id?: string;
  forme?: string;
  prompt?: string;
  stimulus?: string;
  points?: number;
  explanation?: string;
  multiple?: boolean;
  choices?: ChoixBrut[];
  rubrique?: string[];
};

/**
 * Convertit le contenu stocké vers la forme manipulée par
 * l'éditeur, en comblant les champs absents. Tolérant par
 * construction : un exercice enregistré sous une version
 * antérieure du modèle doit rester ouvrable.
 */
function versEditeur(
  id: string,
  kind: TypeExercice,
  titre: string,
  brief: string,
  contenu: unknown,
): ExerciceInitial {
  const racine = (contenu ?? {}) as {
    consigne_generale?: string;
    questions?: QuestionBrute[];
  };

  const questions = (racine.questions ?? []).map((q) => ({
    id: q.id ?? nouvelIdentifiant("q"),
    forme: q.forme === "ouverte" ? ("ouverte" as const) : ("fermee" as const),
    prompt: q.prompt ?? "",
    stimulus: q.stimulus ?? "",
    points: typeof q.points === "number" ? q.points : 1,
    explanation: q.explanation ?? "",
    multiple: Boolean(q.multiple),
    choices:
      q.choices && q.choices.length > 0
        ? q.choices.map((c) => ({
            id: c.id ?? nouvelIdentifiant("c"),
            label: c.label ?? "",
            correct: Boolean(c.correct),
            rationale: c.rationale ?? "",
          }))
        : [
            { id: nouvelIdentifiant("c"), label: "", correct: true, rationale: "" },
            { id: nouvelIdentifiant("c"), label: "", correct: false, rationale: "" },
          ],
    rubrique: q.rubrique ?? [],
  }));

  return {
    id,
    kind,
    titre,
    brief,
    consigneGenerale: racine.consigne_generale ?? "",
    questions:
      questions.length > 0
        ? questions
        : [
            {
              id: nouvelIdentifiant("q"),
              forme: "fermee" as const,
              prompt: "",
              stimulus: "",
              points: 1,
              explanation: "",
              multiple: false,
              choices: [
                { id: nouvelIdentifiant("c"), label: "", correct: true, rationale: "" },
                { id: nouvelIdentifiant("c"), label: "", correct: false, rationale: "" },
              ],
              rubrique: [],
            },
          ],
  };
}

export default async function PageExercice({
  params,
}: {
  params: Promise<{ exerciceId: string }>;
}) {
  const { exerciceId } = await params;
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();

  const { data: exercice } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", exerciceId)
    .maybeSingle();

  if (!exercice) notFound();

  const [{ data: affectations }, { data: cohortes }] = await Promise.all([
    supabase
      .from("exercise_assignments")
      .select("id, cohort_id, due_at, published_at, max_attempts, reveal_corrections, cohorts(name)")
      .eq("exercise_id", exerciceId),
    supabase
      .from("cohorts")
      .select("id, name")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-encre-douce">
        <Link href="/exercices" className="hover:underline">
          Bibliothèque d&apos;exercices
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{exercice.title}</span>
      </nav>

      <Titre className="mt-3">{exercice.title}</Titre>

      <section className="mt-8">
        <Titre niveau={2}>Affectations</Titre>
        {!affectations || affectations.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Cet exercice n'est affecté à aucune formation" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {affectations.map((affectation) => (
              <li
                key={affectation.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {(affectation.cohorts as { name: string } | null)?.name}
                </span>
                <Etiquette ton={affectation.published_at ? "succes" : "alerte"}>
                  {affectation.published_at ? "Publié" : "Brouillon"}
                </Etiquette>
                {affectation.due_at && (
                  <span className="text-xs text-encre-tres-douce">
                    échéance {dateFr(affectation.due_at, true)}
                  </span>
                )}
                <span className="text-xs text-encre-tres-douce">
                  {affectation.max_attempts
                    ? `${affectation.max_attempts} tentative${affectation.max_attempts > 1 ? "s" : ""}`
                    : "tentatives illimitées"}
                  {affectation.reveal_corrections ? " · corrigé révélé" : " · score seul"}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={`/formations/${affectation.cohort_id}/exercices/${affectation.id}/resultats`}
                    className="text-accent-encre hover:underline"
                  >
                    Résultats
                  </Link>
                  <form action={retirerAffectation.bind(null, affectation.id, exerciceId)}>
                    <Bouton type="submit" variante="danger">
                      Retirer
                    </Bouton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg border border-bordure bg-fond-eleve">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Affecter à une formation
          </summary>
          <div className="border-t border-bordure p-5">
            <FormulaireAffectation exerciceId={exerciceId} cohortes={cohortes ?? []} />
          </div>
        </details>
      </section>

      <section className="mt-12">
        <Titre niveau={2}>Contenu</Titre>
        <Carte className="mt-3 border-alerte/30 bg-alerte-faible p-4">
          <p className="text-sm">
            Modifier un exercice déjà passé ne recalcule pas les tentatives
            enregistrées : les scores obtenus restent ceux du barème en vigueur
            au moment de la soumission.
          </p>
        </Carte>
        <div className="mt-5">
          <EditeurExercice
            initial={versEditeur(
              exercice.id,
              exercice.kind as TypeExercice,
              exercice.title,
              exercice.brief,
              exercice.content,
            )}
          />
        </div>
      </section>
    </main>
  );
}
