import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase à chaque requête et interdit
 * l'accès aux routes privées sans compte.
 *
 * Next 16 nomme ce fichier `proxy.ts` (anciennement `middleware.ts`)
 * et attend un export nommé `proxy`.
 *
 * Attention : ce filtre est une commodité d'expérience utilisateur,
 * pas une barrière de sécurité. Le cloisonnement réel des données
 * est assuré par les politiques RLS de Postgres.
 */

const ROUTES_PUBLIQUES = [
  "/",
  "/connexion",
  "/inscription",
  "/auth/confirmer",
  "/mentions-legales",
  "/confidentialite",
];

function estRoutePublique(chemin: string): boolean {
  return ROUTES_PUBLIQUES.some(
    (route) => chemin === route || chemin.startsWith(`${route}/`),
  );
}

export async function proxy(request: NextRequest) {
  let reponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          reponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            reponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() valide le jeton auprès de Supabase.
  // Ne pas utiliser getSession() ici : son contenu vient du cookie
  // et n'est donc pas digne de confiance côté serveur.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chemin = request.nextUrl.pathname;

  if (!user && !estRoutePublique(chemin)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", chemin);
    return NextResponse.redirect(url);
  }

  if (user && (chemin === "/connexion" || chemin === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/tableau-de-bord";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return reponse;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques et les images,
     * pour éviter un appel réseau à Supabase sur chaque asset.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
