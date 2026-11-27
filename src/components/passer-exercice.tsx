"use client";

import { useState, useTransition } from "react";
import { Bouton, Carte, Etiquette, Message, Titre } from "@/components/ui";
import { soumettreTentative } from "@/lib/actions/exercices";

/* ============================================================
   Passation d'un exercice.

   L'énoncé reçu ici est déjà expurgé par la base : il ne
   contient ni les bonnes réponses ni les commentaires de
   correction. Les afficher est impossible avant soumission,
   y compris en inspectant le trafic réseau.
   ============================================================ */

type ChoixAffiche = { id: string; label: string };

type QuestionAffichee = {
  id: string;
  forme: "fermee" | "ouverte";
  prompt: string;
  stimulus?: string;
  points?: number;
  multiple?: boolean;
  choices?: ChoixAffiche[];
  rubrique?: string[];
};

export type EnonceExercice = {
  id: string;
  title: string;
  brief: string;
  max_attempts: number | null;
  tentatives_utilisees: number;
  content: {
    consigne_generale?: string;
    questions: QuestionAffichee[];
  };
};

type DetailCorrection = {
  question_id: string;
  auto_corrigee: boolean;
  points: number;
  obtenu: number | null;
  juste: boolean | null;
  attendu?: string[] | null;
  donne?: string[] | null;
  explication?: string | null;
};

type Correction = {
  score: number;
  max_score: number;
  par_question: DetailCorrection[];
  corrections_revelees: boolean;
  /** Numéro de la tentative qui vient d'être enregistrée, calculé
      par la base : l'interface ne peut pas le déduire sans risque
      de décalage après revalidation. */
  tentative_numero: number;
  max_attempts: number | null;
};

export function PasserExercice({ enonce }: { enonce: EnonceExercice }) {
  const [reponses, setReponses] = useState<Record<string, string[] | string>>({});
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enAttente, demarrer] = useTransition();

  const tentativesRestantes =
    enonce.max_attempts === null
      ? null
      : enonce.max_attempts - enonce.tentatives_utilisees;
  const epuise = tentativesRestantes !== null && tentativesRestantes <= 0;

  function basculerChoix(question: QuestionAffichee, choixId: string) {
    setReponses((courant) => {
      if (!question.multiple) {
        return { ...courant, [question.id]: [choixId] };
      }
      const actuel = courant[question.id];
      const liste = Array.isArray(actuel) ? actuel : [];
      return {
        ...courant,
        [question.id]: liste.includes(choixId)
          ? liste.filter((c) => c !== choixId)
          : [...liste, choixId],
      };
    });
  }

  function soumettre() {
    setErreur(null);
    demarrer(async () => {
      const resultat = await soumettreTentative({
        affectationId: enonce.id,
        reponses,
      });
      if (!resultat.ok) {
        setErreur(resultat.erreurs.join(" · "));
        return;
      }
      setCorrection(resultat.donnees as unknown as Correction);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const detailPour = (questionId: string) =>
    correction?.par_question.find((d) => d.question_id === questionId);

  return (
    <div className="space-y-6">
      {correction && (
        <Carte className="p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <Titre niveau={2}>
              {correction.score} / {correction.max_score}
            </Titre>
            <span className="text-sm text-encre-douce">
              {correction.max_score > 0
                ? `${Math.round((correction.score / correction.max_score) * 100)} %`
                : "aucune question auto-corrigée"}
            </span>
          </div>
          {!correction.corrections_revelees && (
            <p className="mt-2 text-sm text-encre-douce">
              Le corrigé détaillé n&apos;est pas affiché pour cet exercice.
            </p>
          )}
          {correction.max_attempts !== null ? (
            <p className="mt-2 text-sm text-encre-douce">
              Tentative {correction.tentative_numero} sur {correction.max_attempts}.
              {correction.tentative_numero < correction.max_attempts
                ? " Rechargez la page pour recommencer."
                : " Vous avez épuisé vos tentatives."}
            </p>
          ) : (
            <p className="mt-2 text-sm text-encre-douce">
              Tentative {correction.tentative_numero}. Rechargez la page pour
              recommencer : les tentatives sont illimitées.
            </p>
          )}
        </Carte>
      )}

      {erreur && <Message ton="danger">{erreur}</Message>}

      {epuise && !correction && (
        <Message ton="alerte" titre="Tentatives épuisées">
          Vous avez utilisé vos {enonce.max_attempts} tentatives pour cet exercice.
        </Message>
      )}

      {enonce.content.consigne_generale && (
        <Message ton="info">{enonce.content.consigne_generale}</Message>
      )}

      <ol className="space-y-5">
        {enonce.content.questions.map((question, index) => {
          const detail = detailPour(question.id);
          const reponse = reponses[question.id];
          const selection = Array.isArray(reponse) ? reponse : [];

          return (
            <li key={question.id}>
              <Carte
                className={`p-5 ${
                  detail?.juste === true
                    ? "border-succes/40"
                    : detail?.juste === false
                      ? "border-danger/40"
                      : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Titre niveau={3}>Question {index + 1}</Titre>
                  {question.points != null && (
                    <span className="text-xs text-encre-tres-douce">
                      {question.points} point{question.points > 1 ? "s" : ""}
                    </span>
                  )}
                  {detail?.auto_corrigee && (
                    <Etiquette ton={detail.juste ? "succes" : "danger"}>
                      {detail.juste ? "Juste" : "Faux"}
                    </Etiquette>
                  )}
                  {detail && !detail.auto_corrigee && (
                    <Etiquette ton="neutre">Correction manuelle</Etiquette>
                  )}
                </div>

                {question.stimulus && (
                  <blockquote className="stimulus mt-3 border-l-2 border-bordure-forte pl-4">
                    {question.stimulus}
                  </blockquote>
                )}

                <p className="mt-3 font-medium">{question.prompt}</p>

                {question.forme === "fermee" ? (
                  <div className="mt-3 space-y-2">
                    {question.multiple && (
                      <p className="text-xs text-encre-douce">Plusieurs réponses attendues.</p>
                    )}
                    {(question.choices ?? []).map((choix) => {
                      const estAttendu = detail?.attendu?.includes(choix.id) ?? false;
                      const estDonne = detail?.donne?.includes(choix.id) ?? false;

                      return (
                        <label
                          key={choix.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm ${
                            detail
                              ? estAttendu
                                ? "border-succes/40 bg-succes-faible"
                                : estDonne
                                  ? "border-danger/40 bg-danger-faible"
                                  : "border-bordure"
                              : selection.includes(choix.id)
                                ? "border-accent bg-accent-faible"
                                : "border-bordure hover:bg-fond-enfonce"
                          }`}
                        >
                          <input
                            type={question.multiple ? "checkbox" : "radio"}
                            name={question.id}
                            className="mt-0.5"
                            checked={selection.includes(choix.id)}
                            disabled={Boolean(correction) || epuise}
                            onChange={() => basculerChoix(question, choix.id)}
                          />
                          <span>{choix.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={5}
                      className="w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2 text-sm"
                      value={typeof reponse === "string" ? reponse : ""}
                      disabled={Boolean(correction) || epuise}
                      onChange={(e) =>
                        setReponses((courant) => ({
                          ...courant,
                          [question.id]: e.target.value,
                        }))
                      }
                      placeholder="Votre réponse…"
                    />
                    {question.rubrique && question.rubrique.length > 0 && (
                      <div className="rounded-md border border-bordure bg-fond-enfonce p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-encre-douce">
                          Critères
                        </p>
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-encre-douce">
                          {question.rubrique.map((critere, i) => (
                            <li key={i}>{critere}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-encre-douce">
                      Cette question n&apos;entre pas dans le score automatique :
                      votre formateur la lit.
                    </p>
                  </div>
                )}

                {detail?.explication && (
                  <div className="mt-4 rounded-md border border-bordure bg-fond-enfonce p-3.5 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-encre-douce">
                      Correction
                    </p>
                    <p className="mt-1.5">{detail.explication}</p>
                  </div>
                )}
              </Carte>
            </li>
          );
        })}
      </ol>

      {!correction && !epuise && (
        <div className="flex flex-wrap items-center gap-4">
          <Bouton type="button" onClick={soumettre} disabled={enAttente}>
            {enAttente ? "Envoi…" : "Soumettre mes réponses"}
          </Bouton>
          <p className="text-sm text-encre-douce">
            {tentativesRestantes === null
              ? "Tentatives illimitées."
              : `${tentativesRestantes} tentative${tentativesRestantes > 1 ? "s" : ""} restante${tentativesRestantes > 1 ? "s" : ""}.`}
          </p>
        </div>
      )}
    </div>
  );
}
