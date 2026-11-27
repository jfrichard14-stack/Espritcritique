"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EtatFormulaire = {
  erreur?: string;
  message?: string;
};

const CheminSuite = z
  .string()
  .regex(/^\/[A-Za-z0-9\-/_]*$/, "chemin interne uniquement")
  .optional();

/**
 * Valide la destination post-connexion.
 * Refuse toute URL absolue : sans ce filtre, un lien
 * /connexion?suite=https://ailleurs.example redirigerait
 * l'utilisateur hors du site après authentification.
 */
function destinationSure(brut: unknown): string {
  const resultat = CheminSuite.safeParse(brut);
  if (!resultat.success || !resultat.data || resultat.data.startsWith("//")) {
    return "/tableau-de-bord";
  }
  return resultat.data;
}

const Identifiants = z.object({
  email: z.email("Adresse électronique invalide"),
  motdepasse: z.string().min(1, "Mot de passe requis"),
});

export async function connexion(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const analyse = Identifiants.safeParse({
    email: formulaire.get("email"),
    motdepasse: formulaire.get("motdepasse"),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: analyse.data.email,
    password: analyse.data.motdepasse,
  });

  if (error) {
    // Message volontairement indifférencié : préciser « adresse
    // inconnue » permettrait d'énumérer les comptes existants.
    return { erreur: "Adresse ou mot de passe incorrect." };
  }

  redirect(destinationSure(formulaire.get("suite")));
}

const Inscription = z.object({
  nom: z.string().trim().min(2, "Indiquez votre nom et prénom"),
  email: z.email("Adresse électronique invalide"),
  motdepasse: z
    .string()
    .min(10, "Au moins 10 caractères")
    .max(200, "Mot de passe trop long"),
});

export async function inscription(
  _precedent: EtatFormulaire,
  formulaire: FormData,
): Promise<EtatFormulaire> {
  const analyse = Inscription.safeParse({
    nom: formulaire.get("nom"),
    email: formulaire.get("email"),
    motdepasse: formulaire.get("motdepasse"),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: analyse.data.email,
    password: analyse.data.motdepasse,
    options: {
      data: { full_name: analyse.data.nom },
      emailRedirectTo: `${siteUrl}/auth/confirmer`,
    },
  });

  if (error) {
    return { erreur: error.message };
  }

  // Si la confirmation par courriel est active sur le projet,
  // signUp ne renvoie pas de session : il faut attendre le clic
  // dans le courriel.
  if (!data.session) {
    return {
      message:
        "Compte créé. Un courriel de confirmation vient de vous être envoyé : " +
        "ouvrez le lien qu'il contient pour activer votre accès.",
    };
  }

  redirect("/tableau-de-bord");
}

export async function deconnexion(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
