import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Carte, Etiquette, Titre, Vide, dateFr } from "@/components/ui";
import { exigerFormateur } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Résultats" };

export default async function PageResultats({
  params,
}: {
  params: Promise<{ cohorteId: string; affectationId: string }>;
}) {
  const { cohorteId, affectationId } = await params;
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();

  const { data: affectation } = await supabase
    .from("exercise_assignments")
    .select("id, due_at, published_at, max_attempts, exercises(title), cohorts(name)")
    .eq("id", affectationId)
    .maybeSingle();

  if (!affectation) notFound();

  const { data: tentatives } = await supabase
    .from("exercise_attempts")
    .select("id, profile_id, score, max_score, submitted_at, answers, profiles(full_name)")
    .eq("exercise_assignment_id", affectationId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const exercice = affectation.exercises as { title: string } | null;
  const cohorte = affectation.cohorts as { name: string } | null;

  // Meilleure tentative par étudiant.
  const meilleures = new Map<
    string,
    { nom: string; score: number; bareme: number; quand: string; nbTentatives: number }
  >();

  for (const tentative of tentatives ?? []) {
    const nom =
      (tentative.profiles as { full_name: string } | null)?.full_name || "Sans nom";
    const score = Number(tentative.score ?? 0);
    const existante = meilleures.get(tentative.profile_id);
    if (!existante) {
      meilleures.set(tentative.profile_id, {
        nom,
        score,
        bareme: Number(tentative.max_score ?? 0),
        quand: tentative.submitted_at ?? "",
        nbTentatives: 1,
      });
    } else {
      existante.nbTentatives += 1;
      if (score > existante.score) {
        existante.score = score;
        existante.quand = tentative.submitted_at ?? existante.quand;
      }
    }
  }

  const lignes = [...meilleures.values()].sort((a, b) => b.score - a.score);
  const moyenne =
    lignes.length > 0
      ? lignes.reduce((s, l) => s + l.score, 0) / lignes.length
      : null;

  return (
    <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-encre-douce">
        <Link href={`/formations/${cohorteId}`} className="hover:underline">
          {cohorte?.name}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Résultats</span>
      </nav>

      <Titre className="mt-3">{exercice?.title}</Titre>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Carte className="p-4">
          <p className="text-sm text-encre-douce">Étudiants ayant répondu</p>
          <p className="mt-1 text-2xl font-semibold">{lignes.length}</p>
        </Carte>
        <Carte className="p-4">
          <p className="text-sm text-encre-douce">Score moyen</p>
          <p className="mt-1 text-2xl font-semibold">
            {moyenne === null ? "—" : moyenne.toFixed(1)}
            {lignes[0] && (
              <span className="text-base font-normal text-encre-douce">
                {" "}
                / {lignes[0].bareme}
              </span>
            )}
          </p>
        </Carte>
        <Carte className="p-4">
          <p className="text-sm text-encre-douce">Tentatives totales</p>
          <p className="mt-1 text-2xl font-semibold">{tentatives?.length ?? 0}</p>
        </Carte>
      </div>

      <section className="mt-8">
        <Titre niveau={2}>Détail par étudiant</Titre>
        {lignes.length === 0 ? (
          <div className="mt-3">
            <Vide titre="Personne n'a encore répondu" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-fond-eleve">
            {lignes.map((ligne) => (
              <li
                key={ligne.nom + ligne.quand}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-medium">{ligne.nom}</span>
                <span className="text-xs text-encre-tres-douce">
                  {ligne.nbTentatives} tentative{ligne.nbTentatives > 1 ? "s" : ""} ·
                  meilleure le {dateFr(ligne.quand, true)}
                </span>
                <span className="ml-auto">
                  <Etiquette
                    ton={
                      ligne.bareme > 0 && ligne.score / ligne.bareme >= 0.6
                        ? "succes"
                        : "alerte"
                    }
                  >
                    {ligne.score} / {ligne.bareme}
                  </Etiquette>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-encre-douce">
          Le score porte sur les seules questions à choix fermés. Les réponses
          rédigées sont consultables dans les tentatives et restent à corriger
          manuellement.
        </p>
      </section>
    </main>
  );
}
