"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigerFormateur, exigerSession } from "@/lib/session";

export type EtatAction = { erreur?: string; message?: string };

const TAILLE_MAX_RESSOURCE = 50 * 1024 * 1024; // 50 Mo
const TAILLE_MAX_DEPOT = 20 * 1024 * 1024; // 20 Mo

/**
 * Normalise un nom de fichier pour le stockage : retire les
 * accents et tout ce qui n'est pas alphanumérique. Le nom
 * d'origine reste affiché à l'utilisateur, il est conservé en
 * base dans `file_name`.
 */
function nomFichierSur(nom: string): string {
  const sansAccents = nom.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const nettoye = sansAccents
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 120);
  return nettoye || "fichier";
}

// ------------------------------------------------------------
// Cohortes
// ------------------------------------------------------------

const NouvelleCohorte = z.object({
  nom: z.string().trim().min(2, "Donnez un nom à la formation").max(160),
  description: z.string().trim().max(2000).default(""),
  debut: z.string().optional(),
  fin: z.string().optional(),
});

export async function creerCohorte(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const profil = await exigerFormateur();

  const analyse = NouvelleCohorte.safeParse({
    nom: formulaire.get("nom"),
    description: formulaire.get("description") ?? "",
    debut: formulaire.get("debut") || undefined,
    fin: formulaire.get("fin") || undefined,
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      owner_id: profil.id,
      name: analyse.data.nom,
      description: analyse.data.description,
      starts_on: analyse.data.debut ?? null,
      ends_on: analyse.data.fin ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { erreur: `Création impossible : ${error.message}` };
  }

  revalidatePath("/formations");
  redirect(`/formations/${data.id}`);
}

export async function basculerInscriptions(
  cohorteId: string,
  ouvrir: boolean,
): Promise<void> {
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("cohorts")
    .update({ enrolment_open: ouvrir })
    .eq("id", cohorteId);
  revalidatePath(`/formations/${cohorteId}`);
}

const CodeInvitation = z
  .string()
  .trim()
  .min(4, "Code trop court")
  .max(32, "Code trop long");

export async function rejoindreCohorte(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  await exigerSession();

  const analyse = CodeInvitation.safeParse(formulaire.get("code"));
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_cohort", {
    p_invite_code: analyse.data,
  });

  if (error) {
    return { erreur: error.message };
  }

  const resultat = Array.isArray(data) ? data[0] : data;
  if (!resultat) {
    return { erreur: "Code d'invitation inconnu." };
  }

  revalidatePath("/formations");
  redirect(`/formations/${resultat.cohort_id}`);
}

// ------------------------------------------------------------
// Ressources
// ------------------------------------------------------------

const NouvelleRessource = z.object({
  cohorteId: z.uuid(),
  titre: z.string().trim().min(2, "Donnez un titre au support").max(200),
  description: z.string().trim().max(2000).default(""),
  publier: z.boolean().default(false),
});

export async function ajouterRessource(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const profil = await exigerFormateur();

  const analyse = NouvelleRessource.safeParse({
    cohorteId: formulaire.get("cohorteId"),
    titre: formulaire.get("titre"),
    description: formulaire.get("description") ?? "",
    publier: formulaire.get("publier") === "on",
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: "Sélectionnez un fichier." };
  }
  if (fichier.size > TAILLE_MAX_RESSOURCE) {
    return { erreur: "Fichier trop volumineux (50 Mo maximum)." };
  }

  const supabase = await createSupabaseServerClient();
  const dossier = crypto.randomUUID();
  const chemin = `${analyse.data.cohorteId}/${dossier}/${nomFichierSur(fichier.name)}`;

  const { error: errEnvoi } = await supabase.storage
    .from("resources")
    .upload(chemin, fichier, { contentType: fichier.type || undefined });

  if (errEnvoi) {
    return { erreur: `Envoi du fichier impossible : ${errEnvoi.message}` };
  }

  const { error: errBase } = await supabase.from("resources").insert({
    cohort_id: analyse.data.cohorteId,
    title: analyse.data.titre,
    description: analyse.data.description,
    storage_path: chemin,
    file_name: fichier.name,
    mime_type: fichier.type || null,
    size_bytes: fichier.size,
    created_by: profil.id,
    published_at: analyse.data.publier ? new Date().toISOString() : null,
  });

  if (errBase) {
    // Le fichier est déjà envoyé : on le retire pour ne pas
    // laisser d'orphelin dans le stockage.
    await supabase.storage.from("resources").remove([chemin]);
    return { erreur: `Enregistrement impossible : ${errBase.message}` };
  }

  revalidatePath(`/formations/${analyse.data.cohorteId}`);
  return { message: "Support ajouté." };
}

export async function basculerPublicationRessource(
  ressourceId: string,
  cohorteId: string,
  publier: boolean,
): Promise<void> {
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("resources")
    .update({ published_at: publier ? new Date().toISOString() : null })
    .eq("id", ressourceId);
  revalidatePath(`/formations/${cohorteId}`);
}

export async function supprimerRessource(
  ressourceId: string,
  cohorteId: string,
): Promise<void> {
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("resources")
    .select("storage_path")
    .eq("id", ressourceId)
    .maybeSingle();

  await supabase.from("resources").delete().eq("id", ressourceId);
  if (data?.storage_path) {
    await supabase.storage.from("resources").remove([data.storage_path]);
  }
  revalidatePath(`/formations/${cohorteId}`);
}

/**
 * Produit une URL de téléchargement valable quelques minutes.
 * Les compartiments sont privés : aucun fichier n'est accessible
 * par une URL devinable ou permanente.
 */
export async function lienTelechargement(
  compartiment: "resources" | "submissions",
  chemin: string,
): Promise<{ url?: string; erreur?: string }> {
  await exigerSession();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(compartiment)
    .createSignedUrl(chemin, 300, { download: true });

  if (error || !data) {
    return { erreur: "Téléchargement indisponible." };
  }
  return { url: data.signedUrl };
}

// ------------------------------------------------------------
// Devoirs
// ------------------------------------------------------------

const NouveauDevoir = z.object({
  cohorteId: z.uuid(),
  titre: z.string().trim().min(2, "Donnez un titre au devoir").max(200),
  consignes: z.string().trim().max(10000).default(""),
  echeance: z.string().optional(),
  accepteFichier: z.boolean().default(true),
  accepteTexte: z.boolean().default(true),
  retardAutorise: z.boolean().default(true),
  publier: z.boolean().default(false),
});

export async function creerDevoir(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const profil = await exigerFormateur();

  const analyse = NouveauDevoir.safeParse({
    cohorteId: formulaire.get("cohorteId"),
    titre: formulaire.get("titre"),
    consignes: formulaire.get("consignes") ?? "",
    echeance: formulaire.get("echeance") || undefined,
    accepteFichier: formulaire.get("accepteFichier") === "on",
    accepteTexte: formulaire.get("accepteTexte") === "on",
    retardAutorise: formulaire.get("retardAutorise") === "on",
    publier: formulaire.get("publier") === "on",
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }
  if (!analyse.data.accepteFichier && !analyse.data.accepteTexte) {
    return { erreur: "Autorisez au moins un mode de dépôt : fichier ou texte." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assignments").insert({
    cohort_id: analyse.data.cohorteId,
    title: analyse.data.titre,
    instructions: analyse.data.consignes,
    due_at: analyse.data.echeance
      ? new Date(analyse.data.echeance).toISOString()
      : null,
    accepts_file: analyse.data.accepteFichier,
    accepts_text: analyse.data.accepteTexte,
    late_allowed: analyse.data.retardAutorise,
    created_by: profil.id,
    published_at: analyse.data.publier ? new Date().toISOString() : null,
  });

  if (error) {
    return { erreur: `Création impossible : ${error.message}` };
  }

  revalidatePath(`/formations/${analyse.data.cohorteId}`);
  return { message: "Devoir créé." };
}

export async function basculerPublicationDevoir(
  devoirId: string,
  cohorteId: string,
  publier: boolean,
): Promise<void> {
  await exigerFormateur();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("assignments")
    .update({ published_at: publier ? new Date().toISOString() : null })
    .eq("id", devoirId);
  revalidatePath(`/formations/${cohorteId}`);
}

// ------------------------------------------------------------
// Dépôts
// ------------------------------------------------------------

const Depot = z.object({
  devoirId: z.uuid(),
  texte: z.string().max(100000).default(""),
  remettre: z.boolean().default(false),
});

export async function deposerProduction(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const profil = await exigerSession();

  const analyse = Depot.safeParse({
    devoirId: formulaire.get("devoirId"),
    texte: formulaire.get("texte") ?? "",
    remettre: formulaire.get("remettre") === "1",
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();

  const { data: devoir, error: errDevoir } = await supabase
    .from("assignments")
    .select("id, cohort_id, accepts_file, accepts_text, due_at, late_allowed")
    .eq("id", analyse.data.devoirId)
    .maybeSingle();

  if (errDevoir || !devoir) {
    return { erreur: "Devoir introuvable." };
  }

  const enRetard = devoir.due_at ? new Date() > new Date(devoir.due_at) : false;
  if (enRetard && !devoir.late_allowed) {
    return { erreur: "L'échéance est dépassée et les dépôts tardifs sont refusés." };
  }

  let cheminFichier: string | null = null;
  let nomFichier: string | null = null;
  let tailleFichier: number | null = null;

  const fichier = formulaire.get("fichier");
  if (fichier instanceof File && fichier.size > 0) {
    if (!devoir.accepts_file) {
      return { erreur: "Ce devoir n'accepte pas de pièce jointe." };
    }
    if (fichier.size > TAILLE_MAX_DEPOT) {
      return { erreur: "Fichier trop volumineux (20 Mo maximum)." };
    }

    cheminFichier = `${devoir.id}/${profil.id}/${nomFichierSur(fichier.name)}`;
    nomFichier = fichier.name;
    tailleFichier = fichier.size;

    const { error: errEnvoi } = await supabase.storage
      .from("submissions")
      .upload(cheminFichier, fichier, {
        contentType: fichier.type || undefined,
        upsert: true,
      });

    if (errEnvoi) {
      return { erreur: `Envoi du fichier impossible : ${errEnvoi.message}` };
    }
  }

  if (!devoir.accepts_text && analyse.data.texte.trim().length > 0) {
    return { erreur: "Ce devoir n'accepte pas de réponse rédigée." };
  }

  const aQuelqueChose =
    analyse.data.texte.trim().length > 0 || cheminFichier !== null;
  if (analyse.data.remettre && !aQuelqueChose) {
    return { erreur: "Rien à remettre : ajoutez un texte ou un fichier." };
  }

  const charge = {
    assignment_id: devoir.id,
    profile_id: profil.id,
    body: analyse.data.texte,
    submitted_at: analyse.data.remettre ? new Date().toISOString() : null,
    // Un dépôt sans nouveau fichier ne doit pas effacer le
    // fichier déjà envoyé : les colonnes ne sont écrites que
    // si un fichier accompagne cette requête.
    ...(cheminFichier
      ? {
          storage_path: cheminFichier,
          file_name: nomFichier,
          size_bytes: tailleFichier,
        }
      : {}),
  };

  const { error } = await supabase
    .from("submissions")
    .upsert(charge, { onConflict: "assignment_id,profile_id" });

  if (error) {
    return { erreur: `Dépôt impossible : ${error.message}` };
  }

  revalidatePath(`/formations/${devoir.cohort_id}/devoirs/${devoir.id}`);
  return {
    message: analyse.data.remettre
      ? "Production remise."
      : "Brouillon enregistré.",
  };
}

const Retour = z.object({
  depotId: z.uuid(),
  commentaire: z.string().trim().max(20000),
});

export async function donnerRetour(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const profil = await exigerFormateur();

  const analyse = Retour.safeParse({
    depotId: formulaire.get("depotId"),
    commentaire: formulaire.get("commentaire") ?? "",
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("submissions")
    .update({
      feedback: analyse.data.commentaire,
      feedback_at: new Date().toISOString(),
      feedback_by: profil.id,
    })
    .eq("id", analyse.data.depotId);

  if (error) {
    return { erreur: `Enregistrement impossible : ${error.message}` };
  }

  revalidatePath("/formations");
  return { message: "Retour enregistré." };
}
