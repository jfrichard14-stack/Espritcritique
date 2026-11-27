import type { Metadata } from "next";
import { Message, Titre } from "@/components/ui";

export const metadata: Metadata = { title: "Données personnelles" };

export default function PageConfidentialite() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Titre>Données personnelles</Titre>

      <Message ton="alerte" titre="Document à compléter">
        Ce texte est un gabarit technique : il décrit ce que le logiciel
        collecte et conserve effectivement. Les mentions juridiques
        (identité du responsable de traitement, base légale, durées
        exactes, coordonnées de réclamation) doivent être rédigées et
        validées avant toute utilisation avec de vrais étudiants.
      </Message>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <Titre niveau={2}>Ce qui est collecté</Titre>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-encre-douce">
            <li>Nom, prénom et adresse électronique, à la création du compte.</li>
            <li>
              Les productions que vous déposez : textes rédigés dans
              l&apos;interface et fichiers joints.
            </li>
            <li>
              Vos réponses aux exercices, avec leur horodatage et le score
              calculé.
            </li>
            <li>
              Les formations auxquelles vous appartenez et la date à laquelle
              vous les avez rejointes.
            </li>
          </ul>
        </section>

        <section>
          <Titre niveau={2}>Ce qui n&apos;est pas collecté</Titre>
          <p className="mt-2 text-encre-douce">
            Aucun enregistrement audio ou vidéo. Aucun traceur publicitaire,
            aucun outil de mesure d&apos;audience tiers.
          </p>
        </section>

        <section>
          <Titre niveau={2}>Qui y accède</Titre>
          <p className="mt-2 text-encre-douce">
            Le formateur responsable de votre formation, et lui seul. Les
            autres étudiants n&apos;ont accès ni à vos productions, ni à vos
            scores, ni à vos réponses. Cette séparation est appliquée par la
            base de données, indépendamment de l&apos;interface.
          </p>
        </section>

        <section>
          <Titre niveau={2}>Où les données sont hébergées</Titre>
          <p className="mt-2 text-encre-douce">
            Sur une infrastructure située dans l&apos;Union européenne.
          </p>
        </section>

        <section>
          <Titre niveau={2}>Vos droits</Titre>
          <p className="mt-2 text-encre-douce">
            Vous pouvez demander l&apos;accès à vos données, leur
            rectification ou leur suppression, en écrivant au responsable de
            la formation.
          </p>
        </section>
      </div>
    </main>
  );
}
