import Link from "next/link";
import { sessionActuelle } from "@/lib/session";
import { deconnexion } from "@/lib/actions/auth";
import { Bouton, Etiquette, LienBouton } from "@/components/ui";

export async function Entete() {
  const profil = await sessionActuelle();

  return (
    <header className="border-b border-bordure bg-fond-eleve">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href={profil ? "/tableau-de-bord" : "/"} className="font-semibold tracking-tight">
          Esprit Critique
        </Link>

        {profil && (
          <nav className="hidden items-center gap-1 text-sm sm:flex" aria-label="Navigation principale">
            <Link
              href="/tableau-de-bord"
              className="rounded px-2.5 py-1.5 text-encre-douce hover:bg-fond-enfonce hover:text-encre"
            >
              Tableau de bord
            </Link>
            <Link
              href="/formations"
              className="rounded px-2.5 py-1.5 text-encre-douce hover:bg-fond-enfonce hover:text-encre"
            >
              Formations
            </Link>
            {profil.role === "formateur" && (
              <Link
                href="/exercices"
                className="rounded px-2.5 py-1.5 text-encre-douce hover:bg-fond-enfonce hover:text-encre"
              >
                Exercices
              </Link>
            )}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {profil ? (
            <>
              <span className="hidden text-sm text-encre-douce sm:inline">
                {profil.full_name || profil.email}
              </span>
              {profil.role === "formateur" && <Etiquette ton="accent">Formateur</Etiquette>}
              <form action={deconnexion}>
                <Bouton type="submit" variante="discret">
                  Déconnexion
                </Bouton>
              </form>
            </>
          ) : (
            <>
              <LienBouton href="/connexion" variante="discret">
                Connexion
              </LienBouton>
              <LienBouton href="/inscription" variante="principal">
                Créer un compte
              </LienBouton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
