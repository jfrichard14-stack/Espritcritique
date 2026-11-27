"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigerFormateur, exigerSession } from "@/lib/session";
import {
  TYPES_EXERCICE,
  validerContenu,
  type TypeExercice,
} from "@/lib/exercices/schema";

export type Resultat<T> =
  | { ok: true; donnees: T }
  | { ok: false; erreurs: string[] };

const Enregistrement = z.object({
  id: z.uuid().optional(),
  kind: z.enum(TYPES_EXERCICE),
  titre: z.string().trim().min(2, "Titre requis").max(200),
  brief: z.string().trim().max(2000).default(""),
  contenu: z.unknown(),
});

/**
 * Crée ou met à jour un exercice.
 *
 * Le contenu est revalidé ici même si l'éditeur l'a déjà fait :
 * l'appel d'une action serveur n'est pas réservé à l'interface,
 * et rien ne garantit que le client ait respecté le format.
 */
export async function enregistrerExercice(
  charge: unknown,
): Promise<Resultat<{ id: string }>> {
  const profil = await exigerFormateur();

  const analyse = Enregistrement.safeParse(charge);
  if (!analyse.success) {
    return { ok: false, erreurs: analyse.error.issues.map((i) => i.message) };
  }

  const contenu = validerContenu(analyse.data.kind as TypeExercice, analyse.data.contenu);
  if (!contenu.ok) {
    return { ok: false, erreurs: contenu.erreurs };
  }

  const supabase = await createSupabaseServerClient();

  if (analyse.data.id) {
    const { error } = await supabase
      .from("exercises")
      .update({
        kind: analyse.data.kind,
        title: analyse.data.titre,
        brief: analyse.data.brief,
        content: contenu.contenu,
      })
      .eq("id", analyse.data.id);

    if (error) return { ok: false, erreurs: [error.message] };

    revalidatePath("/exercices");
    revalidatePath(`/exercices/${analyse.data.id}`);
    return { ok: true, donnees: { id: analyse.data.id } };
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      owner_id: profil.id,
      kind: analyse.data.kind,
      title: analyse.data.titre,
      brief: analyse.data.brief,
      content: contenu.contenu,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erreurs: [error.message] };

  revalidatePath("/exercices");
  return { ok: true, donnees: { id: data.id } };
}

export async function supprimerExercice(exerciceId: string): Promise<void> {
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();
  await supabase.from("exercises").delete().eq("id", exerciceId);
  revalidatePath("/exercices");
}

const Affectation = z.object({
  exerciceId: z.uuid(),
  cohorteId: z.uuid(),
  echeance: z.string().optional(),
  maxTentatives: z.coerce.number().int().positive().optional(),
  revelerCorrections: z.boolean().default(true),
  publier: z.boolean().default(false),
});

export type EtatAffectation = { erreur?: string; message?: string };

export async function affecterExercice(
  _precedent: EtatAffectation,
  formulaire: FormData,
): Promise<EtatAffectation> {
  await exigerFormateur();

  const analyse = Affectation.safeParse({
    exerciceId: formulaire.get("exerciceId"),
    cohorteId: formulaire.get("cohorteId"),
    echeance: formulaire.get("echeance") || undefined,
    maxTentatives: formulaire.get("maxTentatives") || undefined,
    revelerCorrections: formulaire.get("revelerCorrections") === "on",
    publier: formulaire.get("publier") === "on",
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("exercise_assignments").upsert(
    {
      exercise_id: analyse.data.exerciceId,
      cohort_id: analyse.data.cohorteId,
      due_at: analyse.data.echeance
        ? new Date(analyse.data.echeance).toISOString()
        : null,
      max_attempts: analyse.data.maxTentatives ?? null,
      reveal_corrections: analyse.data.revelerCorrections,
      published_at: analyse.data.publier ? new Date().toISOString() : null,
    },
    { onConflict: "exercise_id,cohort_id" },
  );

  if (error) {
    return { erreur: `Affectation impossible : ${error.message}` };
  }

  revalidatePath(`/exercices/${analyse.data.exerciceId}`);
  revalidatePath(`/formations/${analyse.data.cohorteId}`);
  return { message: "Exercice affecté." };
}

export async function retirerAffectation(
  affectationId: string,
  exerciceId: string,
): Promise<void> {
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();
  await supabase.from("exercise_assignments").delete().eq("id", affectationId);
  revalidatePath(`/exercices/${exerciceId}`);
}

/* ------------------------------------------------------------
   Côté étudiant
   ------------------------------------------------------------ */

const Soumission = z.object({
  affectationId: z.uuid(),
  reponses: z.record(z.string(), z.union([z.array(z.string()), z.string()])),
});

/**
 * Transmet les réponses à la base, qui corrige.
 *
 * La correction n'est volontairement pas faite ici : le barème
 * vit dans une colonne que le serveur applicatif pourrait lire,
 * mais le faire ouvrirait la voie à une divergence entre deux
 * implémentations du même calcul. Une seule source.
 */
export async function soumettreTentative(
  charge: unknown,
): Promise<Resultat<Record<string, unknown>>> {
  await exigerSession();

  const analyse = Soumission.safeParse(charge);
  if (!analyse.success) {
    return { ok: false, erreurs: analyse.error.issues.map((i) => i.message) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_exercise_attempt", {
    p_exercise_assignment_id: analyse.data.affectationId,
    p_answers: analyse.data.reponses,
  });

  if (error) {
    return { ok: false, erreurs: [error.message] };
  }

  revalidatePath("/formations");
  return { ok: true, donnees: data as Record<string, unknown> };
}
