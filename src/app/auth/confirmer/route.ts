import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Point d'arrivée des liens de confirmation envoyés par courriel
 * (création de compte, réinitialisation de mot de passe).
 *
 * Supabase transmet un jeton à usage unique dans l'URL ; on
 * l'échange ici contre une session, puis on redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=lien-invalide`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien-expire`);
  }

  return NextResponse.redirect(`${origin}/tableau-de-bord`);
}
