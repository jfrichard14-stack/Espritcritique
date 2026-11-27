import type { Metadata } from "next";
import Link from "next/link";
import { Titre } from "@/components/ui";
import { EditeurExercice, EXERCICE_VIERGE } from "@/components/editeur-exercice";
import { exigerFormateur } from "@/lib/session";

export const metadata: Metadata = { title: "Nouvel exercice" };

export default async function PageNouvelExercice() {
  await exigerFormateur();

  return (
    <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-encre-douce">
        <Link href="/exercices" className="hover:underline">
          Bibliothèque d&apos;exercices
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Nouvel exercice</span>
      </nav>
      <Titre className="mt-3">Nouvel exercice</Titre>
      <div className="mt-8">
        <EditeurExercice initial={EXERCICE_VIERGE} />
      </div>
    </main>
  );
}
