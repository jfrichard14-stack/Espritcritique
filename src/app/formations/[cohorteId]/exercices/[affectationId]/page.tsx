import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Titre } from "@/components/ui";
import { PasserExercice, type EnonceExercice } from "@/components/passer-exercice";
import { exigerSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Exercice" };

export default async function PagePasserExercice({
  params,
}: {
  params: Promise<{ cohorteId: string; affectationId: string }>;
}) {
  const { cohorteId, affectationId } = await params;
  await exigerSession(`/formations/${cohorteId}/exercices/${affectationId}`);

  const supabase = await createSupabaseServerClient();

  // L'énoncé est servi par une fonction de la base, qui retire
  // les corrigés avant de répondre.
  const { data, error } = await supabase.rpc("get_exercise_for_student", {
    p_exercise_assignment_id: affectationId,
  });

  if (error || !data) notFound();

  const enonce = data as unknown as EnonceExercice & { brief: string };
  const { data: cohorte } = await supabase
    .from("cohorts")
    .select("name")
    .eq("id", cohorteId)
    .maybeSingle();

  return (
    <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-encre-douce">
        <Link href="/tableau-de-bord" className="hover:underline">
          Tableau de bord
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/formations/${cohorteId}`} className="hover:underline">
          {cohorte?.name}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{enonce.title}</span>
      </nav>

      <Titre className="mt-3">{enonce.title}</Titre>
      {enonce.brief && <p className="mt-2 text-sm text-encre-douce">{enonce.brief}</p>}

      <div className="mt-8">
        <PasserExercice enonce={enonce} />
      </div>
    </main>
  );
}
