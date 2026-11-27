import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { requireEnv } from "@/lib/env";

/**
 * Client Supabase pour les composants et actions serveur.
 * Porte la session de l'utilisateur : toutes les requêtes sont
 * donc filtrées par les politiques RLS de la base.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un composant serveur en lecture seule :
            // le rafraîchissement de session est alors assuré par le middleware.
          }
        },
      },
    },
  );
}

/**
 * Client à privilèges étendus, qui ignore les politiques RLS.
 * Réservé aux opérations d'administration (promotion d'un compte
 * en formateur, purge de données). Ne jamais l'utiliser dans un
 * chemin de code atteignable par un utilisateur non administrateur.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
