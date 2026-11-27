import type { Metadata } from "next";
import { Message, Titre } from "@/components/ui";

export const metadata: Metadata = { title: "Mentions légales" };

export default function PageMentionsLegales() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Titre>Mentions légales</Titre>
      <div className="mt-6">
        <Message ton="alerte" titre="À compléter avant mise en service">
          Éditeur du site, statut, numéro SIRET, hébergeur et ses coordonnées,
          contact. Ces informations dépendent de votre situation
          professionnelle et doivent être renseignées par vous.
        </Message>
      </div>
    </main>
  );
}
