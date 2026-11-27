import type { Metadata } from "next";
import { Carte, Titre } from "@/components/ui";
import { FormulaireNouvelleCohorte } from "@/components/formulaires-formations";
import { exigerFormateur } from "@/lib/session";

export const metadata: Metadata = { title: "Nouvelle formation" };

export default async function PageNouvelleCohorte() {
  await exigerFormateur();

  return (
    <main id="contenu" className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <Titre>Nouvelle formation</Titre>
      <p className="mt-2 text-sm text-encre-douce">
        Un code d&apos;inscription sera généré automatiquement.
      </p>
      <Carte className="mt-6 p-6">
        <FormulaireNouvelleCohorte />
      </Carte>
    </main>
  );
}
