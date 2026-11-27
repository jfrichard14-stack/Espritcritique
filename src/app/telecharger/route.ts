import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Télécharge un fichier via une URL signée valable cinq minutes.
 *
 * La création de l'URL signée passe par le client porteur de la
 * session : le service de stockage applique donc ses politiques
 * d'accès. Un étudiant qui forgerait un chemin vers le fichier
 * d'un camarade obtiendrait un refus ici, pas une URL.
 */
const COMPARTIMENTS = new Set(["resources", "submissions"]);

export async function GET(request: NextRequest) {
  const compartiment = request.nextUrl.searchParams.get("c");
  const chemin = request.nextUrl.searchParams.get("p");

  if (!compartiment || !chemin || !COMPARTIMENTS.has(compartiment)) {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/connexion", request.nextUrl.origin));
  }

  const { data, error } = await supabase.storage
    .from(compartiment)
    .createSignedUrl(chemin, 300, { download: true });

  if (error || !data) {
    return NextResponse.json(
      { erreur: "Fichier introuvable ou accès refusé" },
      { status: 404 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
