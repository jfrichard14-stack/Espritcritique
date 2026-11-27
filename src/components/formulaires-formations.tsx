"use client";

import { useActionState } from "react";
import {
  ajouterRessource,
  creerCohorte,
  creerDevoir,
  deposerProduction,
  donnerRetour,
  rejoindreCohorte,
  type EtatAction,
} from "@/lib/actions/formations";
import { Bouton, Champ, Message, ZoneTexte } from "@/components/ui";

const ETAT: EtatAction = {};

function Cases({
  nom,
  label,
  defaut = true,
  aide,
}: {
  nom: string;
  label: string;
  defaut?: boolean;
  aide?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={nom}
        defaultChecked={defaut}
        className="mt-0.5 size-4 rounded border-bordure-forte"
      />
      <span>
        {label}
        {aide && <span className="block text-xs text-encre-douce">{aide}</span>}
      </span>
    </label>
  );
}

export function FormulaireRejoindre() {
  const [etat, action, enCours] = useActionState(rejoindreCohorte, ETAT);

  return (
    <form action={action} className="space-y-4">
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      <Champ
        label="Code de la formation"
        name="code"
        required
        autoFocus
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="ABCD2345"
        aide="Huit caractères, communiqués par votre formateur. La casse n'a pas d'importance."
        className="font-mono text-lg tracking-widest uppercase"
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Vérification…" : "Rejoindre"}
      </Bouton>
    </form>
  );
}

export function FormulaireNouvelleCohorte() {
  const [etat, action, enCours] = useActionState(creerCohorte, ETAT);

  return (
    <form action={action} className="space-y-5">
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      <Champ
        label="Nom de la formation"
        name="nom"
        required
        autoFocus
        placeholder="Argumentation — Master 1, promotion 2026"
      />
      <ZoneTexte
        label="Description"
        name="description"
        rows={3}
        aide="Visible par les étudiants. Objectifs, rythme, modalités d'évaluation."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Début" name="debut" type="date" />
        <Champ label="Fin" name="fin" type="date" />
      </div>
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer la formation"}
      </Bouton>
    </form>
  );
}

export function FormulaireRessource({ cohorteId }: { cohorteId: string }) {
  const [etat, action, enCours] = useActionState(ajouterRessource, ETAT);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cohorteId" value={cohorteId} />
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      {etat.message && <Message ton="succes">{etat.message}</Message>}

      <Champ label="Titre du support" name="titre" required placeholder="Séance 2 — la réfutation" />
      <ZoneTexte label="Description" name="description" rows={2} />
      <div className="space-y-1.5">
        <label htmlFor="fichier" className="block text-sm font-medium">
          Fichier <span className="text-danger">*</span>
        </label>
        <input
          id="fichier"
          name="fichier"
          type="file"
          required
          className="w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2 text-sm
                     file:mr-3 file:rounded file:border-0 file:bg-fond-enfonce file:px-3
                     file:py-1.5 file:text-sm file:font-medium"
        />
        <p className="text-xs text-encre-douce">50 Mo maximum.</p>
      </div>
      <Cases
        nom="publier"
        label="Publier immédiatement"
        aide="Sinon, le support reste en brouillon, invisible pour les étudiants."
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Ajouter le support"}
      </Bouton>
    </form>
  );
}

export function FormulaireDevoir({ cohorteId }: { cohorteId: string }) {
  const [etat, action, enCours] = useActionState(creerDevoir, ETAT);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cohorteId" value={cohorteId} />
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      {etat.message && <Message ton="succes">{etat.message}</Message>}

      <Champ label="Titre du devoir" name="titre" required placeholder="Plaidoyer de trois minutes" />
      <ZoneTexte
        label="Consignes"
        name="consignes"
        rows={4}
        aide="Attendus, format, critères d'évaluation."
      />
      <Champ
        label="Échéance"
        name="echeance"
        type="datetime-local"
        aide="Laisser vide pour un devoir sans date limite."
      />
      <div className="space-y-2.5 rounded-md border border-bordure bg-fond-enfonce p-3.5">
        <Cases nom="accepteTexte" label="Accepter une réponse rédigée en ligne" />
        <Cases nom="accepteFichier" label="Accepter une pièce jointe" />
        <Cases
          nom="retardAutorise"
          label="Accepter les dépôts après l'échéance"
          aide="Les dépôts tardifs restent horodatés."
        />
      </div>
      <Cases nom="publier" label="Publier immédiatement" defaut={false} />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer le devoir"}
      </Bouton>
    </form>
  );
}

export function FormulaireDepot({
  devoirId,
  accepteTexte,
  accepteFichier,
  texteInitial,
  dejaRemis,
}: {
  devoirId: string;
  accepteTexte: boolean;
  accepteFichier: boolean;
  texteInitial: string;
  dejaRemis: boolean;
}) {
  const [etat, action, enCours] = useActionState(deposerProduction, ETAT);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="devoirId" value={devoirId} />
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      {etat.message && <Message ton="succes">{etat.message}</Message>}

      {accepteTexte && (
        <ZoneTexte
          label="Votre réponse"
          name="texte"
          rows={12}
          defaultValue={texteInitial}
          placeholder="Rédigez ici…"
        />
      )}

      {accepteFichier && (
        <div className="space-y-1.5">
          <label htmlFor="fichier" className="block text-sm font-medium">
            Pièce jointe
          </label>
          <input
            id="fichier"
            name="fichier"
            type="file"
            className="w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2 text-sm
                       file:mr-3 file:rounded file:border-0 file:bg-fond-enfonce file:px-3
                       file:py-1.5 file:text-sm file:font-medium"
          />
          <p className="text-xs text-encre-douce">
            20 Mo maximum. Un nouvel envoi remplace le fichier précédent.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <Bouton type="submit" name="remettre" value="1" disabled={enCours}>
          {dejaRemis ? "Remettre à nouveau" : "Remettre"}
        </Bouton>
        <Bouton type="submit" name="remettre" value="0" variante="secondaire" disabled={enCours}>
          Enregistrer le brouillon
        </Bouton>
      </div>
      <p className="text-xs text-encre-douce">
        Un brouillon n&apos;est pas visible par votre formateur. Seule la remise l&apos;est.
      </p>
    </form>
  );
}

export function FormulaireRetour({
  depotId,
  retourInitial,
}: {
  depotId: string;
  retourInitial: string;
}) {
  const [etat, action, enCours] = useActionState(donnerRetour, ETAT);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="depotId" value={depotId} />
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      {etat.message && <Message ton="succes">{etat.message}</Message>}
      <ZoneTexte
        label="Retour"
        name="commentaire"
        rows={6}
        defaultValue={retourInitial}
        aide="Visible par l'étudiant dès l'enregistrement."
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer le retour"}
      </Bouton>
    </form>
  );
}
