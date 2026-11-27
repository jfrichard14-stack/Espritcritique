import type { Metadata } from "next";
import { Carte, Titre } from "@/components/ui";
import { FormulaireRejoindre } from "@/components/formulaires-formations";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Rejoindre une formation" };

export default async function PageRejoindre() {
  await exigerSession("/formations/rejoindre");

  return (
    <main id="contenu" className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <Titre>Rejoindre une formation</Titre>
      <p className="mt-2 text-sm text-encre-douce">
        Saisissez le code communiqué par votre formateur.
      </p>
      <Carte className="mt-6 p-6">
        <FormulaireRejoindre />
      </Carte>
    </main>
  );
}
