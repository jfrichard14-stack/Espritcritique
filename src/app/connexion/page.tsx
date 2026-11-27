import type { Metadata } from "next";
import { Carte, Message, Titre } from "@/components/ui";
import { FormulaireConnexion } from "@/components/formulaires-auth";

export const metadata: Metadata = { title: "Connexion" };

const MESSAGES_ERREUR: Record<string, string> = {
  "lien-invalide": "Ce lien de confirmation est incomplet. Demandez-en un nouveau.",
  "lien-expire": "Ce lien de confirmation a expiré. Demandez-en un nouveau.",
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; erreur?: string }>;
}) {
  const { suite, erreur } = await searchParams;

  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <Titre>Connexion</Titre>
        <p className="mt-2 text-sm text-encre-douce">
          Accédez à vos formations, supports et exercices.
        </p>

        {erreur && MESSAGES_ERREUR[erreur] && (
          <div className="mt-6">
            <Message ton="alerte">{MESSAGES_ERREUR[erreur]}</Message>
          </div>
        )}

        <Carte className="mt-6 p-6">
          <FormulaireConnexion suite={suite} />
        </Carte>
      </main>
    </>
  );
}
