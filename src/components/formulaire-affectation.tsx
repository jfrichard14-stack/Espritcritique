"use client";

import { useActionState } from "react";
import { affecterExercice, type EtatAffectation } from "@/lib/actions/exercices";
import { Bouton, Champ, Message } from "@/components/ui";

const ETAT: EtatAffectation = {};

export function FormulaireAffectation({
  exerciceId,
  cohortes,
}: {
  exerciceId: string;
  cohortes: { id: string; name: string }[];
}) {
  const [etat, action, enCours] = useActionState(affecterExercice, ETAT);

  if (cohortes.length === 0) {
    return (
      <Message ton="alerte">
        Créez d&apos;abord une formation pour pouvoir y affecter cet exercice.
      </Message>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="exerciceId" value={exerciceId} />
      {etat.erreur && <Message ton="danger">{etat.erreur}</Message>}
      {etat.message && <Message ton="succes">{etat.message}</Message>}

      <div className="space-y-1.5">
        <label htmlFor="cohorteId" className="block text-sm font-medium">
          Formation <span className="text-danger">*</span>
        </label>
        <select
          id="cohorteId"
          name="cohorteId"
          required
          className="w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2 text-sm"
        >
          {cohortes.map((cohorte) => (
            <option key={cohorte.id} value={cohorte.id}>
              {cohorte.name}
            </option>
          ))}
        </select>
      </div>

      <Champ label="Échéance" name="echeance" type="datetime-local" />
      <Champ
        label="Nombre de tentatives"
        name="maxTentatives"
        type="number"
        min={1}
        aide="Laisser vide pour un nombre illimité."
      />

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="revelerCorrections"
          defaultChecked
          className="mt-0.5 size-4"
        />
        <span>
          Révéler le corrigé après soumission
          <span className="block text-xs text-encre-douce">
            Sinon, l&apos;étudiant voit son score sans les bonnes réponses.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="publier" className="size-4" />
        Publier immédiatement
      </label>

      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Affectation…" : "Affecter"}
      </Bouton>
    </form>
  );
}
