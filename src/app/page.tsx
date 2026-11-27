import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Carte, LienBouton, Titre } from "@/components/ui";
import { sessionActuelle } from "@/lib/session";

export const metadata: Metadata = {
  title: "Esprit Critique — espace de travail",
};

export default async function PageAccueil() {
  const profil = await sessionActuelle();
  if (profil) redirect("/tableau-de-bord");

  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <Titre className="text-3xl">Espace de travail</Titre>
        <p className="mt-4 max-w-xl text-encre-douce">
          Prise de parole en public, argumentation, esprit critique. Vos
          supports, vos exercices et vos productions au même endroit, pendant
          et entre les séances.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <LienBouton href="/inscription" variante="principal">
            Créer un compte
          </LienBouton>
          <LienBouton href="/connexion">J&apos;ai déjà un compte</LienBouton>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              titre: "Supports",
              texte: "Téléchargez les documents de séance dès qu'ils sont publiés.",
            },
            {
              titre: "Productions",
              texte: "Déposez vos travaux et retrouvez les retours de votre formateur.",
            },
            {
              titre: "Exercices",
              texte: "Entraînez-vous sur des séries corrigées automatiquement.",
            },
          ].map((bloc) => (
            <Carte key={bloc.titre} className="p-5">
              <Titre niveau={2} className="text-base">
                {bloc.titre}
              </Titre>
              <p className="mt-2 text-sm text-encre-douce">{bloc.texte}</p>
            </Carte>
          ))}
        </div>
      </main>
    </>
  );
}
