import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "formateur" | "etudiant";

export type Profil = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
};

/**
 * Session courante, ou null. N'effectue aucune redirection :
 * à utiliser dans les pages publiques qui s'adaptent à l'état
 * de connexion.
 *
 * Repose sur getUser(), qui valide le jeton auprès de Supabase.
 * getSession() lit le cookie sans le vérifier et ne doit jamais
 * servir à une décision d'autorisation côté serveur.
 */
export async function sessionActuelle(): Promise<Profil | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profil) return null;

  return {
    id: profil.id,
    role: profil.role,
    full_name: profil.full_name,
    email: user.email ?? "",
  };
}

/** Session obligatoire : redirige vers la connexion si absente. */
export async function exigerSession(suite?: string): Promise<Profil> {
  const profil = await sessionActuelle();
  if (!profil) {
    redirect(suite ? `/connexion?suite=${encodeURIComponent(suite)}` : "/connexion");
  }
  return profil;
}

/**
 * Session de formateur obligatoire.
 *
 * Ce contrôle évite d'afficher une page inutile ; il ne constitue
 * pas la protection des données, assurée par les politiques RLS.
 */
export async function exigerFormateur(): Promise<Profil> {
  const profil = await exigerSession();
  if (profil.role !== "formateur") {
    redirect("/tableau-de-bord");
  }
  return profil;
}
