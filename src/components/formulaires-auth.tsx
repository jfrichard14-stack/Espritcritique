"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connexion, inscription, type EtatFormulaire } from "@/lib/actions/auth";
import { Bouton, Champ, Message } from "@/components/ui";

const ETAT_INITIAL: EtatFormulaire = {};

export function FormulaireConnexion({ suite }: { suite?: string }) {
  const [etat, action, enCours] = useActionState(connexion, ETAT_INITIAL);

  return (
    <form action={action} className="space-y-4">
      {suite && <input type="hidden" name="suite" value={suite} />}

      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}

      <Champ
        label="Adresse électronique"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="vous@exemple.fr"
      />
      <Champ
        label="Mot de passe"
        name="motdepasse"
        type="password"
        autoComplete="current-password"
        required
      />

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </Bouton>

      <p className="text-sm text-encre-douce">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-accent-encre underline">
          En créer un
        </Link>
      </p>
    </form>
  );
}

export function FormulaireInscription() {
  const [etat, action, enCours] = useActionState(inscription, ETAT_INITIAL);

  if (etat.message) {
    return <Message ton="succes" titre="Vérifiez votre messagerie">{etat.message}</Message>;
  }

  return (
    <form action={action} className="space-y-4">
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}

      <Champ
        label="Nom et prénom"
        name="nom"
        required
        autoComplete="name"
        aide="Tel qu'il apparaîtra pour votre formateur."
      />
      <Champ
        label="Adresse électronique"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Champ
        label="Mot de passe"
        name="motdepasse"
        type="password"
        autoComplete="new-password"
        required
        aide="Dix caractères au minimum."
      />

      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Création…" : "Créer mon compte"}
      </Bouton>

      <p className="text-sm text-encre-douce">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-accent-encre underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
