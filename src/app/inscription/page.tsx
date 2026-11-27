import type { Metadata } from "next";
import { Carte, Titre } from "@/components/ui";
import { FormulaireInscription } from "@/components/formulaires-auth";

export const metadata: Metadata = { title: "Créer un compte" };

export default function PageInscription() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <Titre>Créer un compte</Titre>
        <p className="mt-2 text-sm text-encre-douce">
          Une fois inscrit, vous rejoindrez votre formation avec le code
          communiqué par votre formateur.
        </p>

        <Carte className="mt-6 p-6">
          <FormulaireInscription />
        </Carte>

        <p className="mt-6 text-xs text-encre-douce">
          Les données que vous déposez (nom, adresse électronique, productions)
          sont conservées pour la durée de la formation et accessibles à votre
          seul formateur.{" "}
          <a href="/confidentialite" className="underline">
            En savoir plus
          </a>
          .
        </p>
      </main>
    </>
  );
}
