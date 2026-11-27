"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bouton, Carte, Etiquette, Message, Titre } from "@/components/ui";
import { enregistrerExercice } from "@/lib/actions/exercices";
import {
  LIBELLES_TYPE,
  TYPES_EXERCICE,
  nouvelIdentifiant,
  type TypeExercice,
} from "@/lib/exercices/schema";

/* ============================================================
   Éditeur d'exercice.

   L'état est tenu en mémoire sous une forme plus permissive que
   le schéma de validation (tous les champs présents, même vides),
   et converti au format attendu au moment de l'enregistrement.
   Cela évite d'avoir à gérer des champs absents pendant la saisie.
   ============================================================ */

type BrouillonChoix = {
  id: string;
  label: string;
  correct: boolean;
  rationale: string;
};

type BrouillonQuestion = {
  id: string;
  forme: "fermee" | "ouverte";
  prompt: string;
  stimulus: string;
  points: number;
  explanation: string;
  multiple: boolean;
  choices: BrouillonChoix[];
  rubrique: string[];
};

export type ExerciceInitial = {
  id?: string;
  kind: TypeExercice;
  titre: string;
  brief: string;
  consigneGenerale: string;
  questions: BrouillonQuestion[];
};

function questionVierge(): BrouillonQuestion {
  return {
    id: nouvelIdentifiant("q"),
    forme: "fermee",
    prompt: "",
    stimulus: "",
    points: 1,
    explanation: "",
    multiple: false,
    choices: [
      { id: nouvelIdentifiant("c"), label: "", correct: true, rationale: "" },
      { id: nouvelIdentifiant("c"), label: "", correct: false, rationale: "" },
    ],
    rubrique: [],
  };
}

export const EXERCICE_VIERGE: ExerciceInitial = {
  kind: "drill",
  titre: "",
  brief: "",
  consigneGenerale: "",
  questions: [questionVierge()],
};

const CHAMP =
  "w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2 text-sm " +
  "placeholder:text-encre-tres-douce";

export function EditeurExercice({ initial }: { initial: ExerciceInitial }) {
  const router = useRouter();
  const [enAttente, demarrer] = useTransition();
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [succes, setSucces] = useState<string | null>(null);

  const [kind, setKind] = useState<TypeExercice>(initial.kind);
  const [titre, setTitre] = useState(initial.titre);
  const [brief, setBrief] = useState(initial.brief);
  const [consigne, setConsigne] = useState(initial.consigneGenerale);
  const [questions, setQuestions] = useState<BrouillonQuestion[]>(initial.questions);

  function majQuestion(index: number, modif: Partial<BrouillonQuestion>) {
    setQuestions((liste) =>
      liste.map((q, i) => (i === index ? { ...q, ...modif } : q)),
    );
  }

  function deplacer(index: number, sens: -1 | 1) {
    setQuestions((liste) => {
      const cible = index + sens;
      if (cible < 0 || cible >= liste.length) return liste;
      const copie = [...liste];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  }

  const bareme = questions
    .filter((q) => q.forme === "fermee" && q.choices.some((c) => c.correct))
    .reduce((somme, q) => somme + q.points, 0);

  function enregistrer() {
    setErreurs([]);
    setSucces(null);

    const contenu = {
      consigne_generale: consigne,
      questions: questions.map((q) =>
        q.forme === "fermee"
          ? {
              id: q.id,
              forme: "fermee" as const,
              prompt: q.prompt,
              stimulus: q.stimulus || undefined,
              points: q.points,
              explanation: q.explanation || undefined,
              multiple: q.multiple,
              choices: q.choices.map((c) => ({
                id: c.id,
                label: c.label,
                correct: c.correct,
                rationale: c.rationale || undefined,
              })),
            }
          : {
              id: q.id,
              forme: "ouverte" as const,
              prompt: q.prompt,
              stimulus: q.stimulus || undefined,
              points: q.points,
              explanation: q.explanation || undefined,
              rubrique: q.rubrique.filter((r) => r.trim().length > 0),
            },
      ),
    };

    demarrer(async () => {
      const resultat = await enregistrerExercice({
        id: initial.id,
        kind,
        titre,
        brief,
        contenu,
      });

      if (!resultat.ok) {
        setErreurs(resultat.erreurs);
        return;
      }

      setSucces("Exercice enregistré.");
      if (!initial.id) {
        router.push(`/exercices/${resultat.donnees.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {erreurs.length > 0 && (
        <Message ton="danger" titre="Enregistrement impossible">
          <ul className="list-disc space-y-0.5 pl-5">
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Message>
      )}
      {succes && <Message ton="succes">{succes}</Message>}

      <Carte className="space-y-4 p-5">
        <div className="space-y-1.5">
          <label htmlFor="titre" className="block text-sm font-medium">
            Titre
          </label>
          <input
            id="titre"
            className={CHAMP}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Repérage de procédés argumentatifs — série 1"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kind" className="block text-sm font-medium">
            Type
          </label>
          <select
            id="kind"
            className={CHAMP}
            value={kind}
            onChange={(e) => setKind(e.target.value as TypeExercice)}
          >
            {TYPES_EXERCICE.filter((t) => t !== "argument_map").map((t) => (
              <option key={t} value={t}>
                {LIBELLES_TYPE[t]}
              </option>
            ))}
          </select>
          <p className="text-xs text-encre-douce">
            Le type ne change pas le fonctionnement de la correction : il sert
            au classement et à l&apos;affichage.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="brief" className="block text-sm font-medium">
            Présentation
          </label>
          <textarea
            id="brief"
            rows={2}
            className={CHAMP}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Dix énoncés à qualifier. Comptez quinze minutes."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="consigne" className="block text-sm font-medium">
            Consigne générale
          </label>
          <textarea
            id="consigne"
            rows={2}
            className={CHAMP}
            value={consigne}
            onChange={(e) => setConsigne(e.target.value)}
            placeholder="Pour chaque énoncé, identifiez le procédé qui rend l'argument contestable."
          />
        </div>
      </Carte>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Titre niveau={2}>
          Questions{" "}
          <span className="font-normal text-encre-douce">({questions.length})</span>
        </Titre>
        <Etiquette ton="accent">Barème automatique : {bareme} point{bareme > 1 ? "s" : ""}</Etiquette>
      </div>

      <ol className="space-y-5">
        {questions.map((question, index) => (
          <li key={question.id}>
            <BlocQuestion
              question={question}
              index={index}
              total={questions.length}
              surChangement={(modif) => majQuestion(index, modif)}
              surDeplacement={(sens) => deplacer(index, sens)}
              surSuppression={() =>
                setQuestions((liste) => liste.filter((_, i) => i !== index))
              }
            />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Bouton
          type="button"
          variante="secondaire"
          onClick={() => setQuestions((liste) => [...liste, questionVierge()])}
        >
          Ajouter une question
        </Bouton>
        <Bouton type="button" onClick={enregistrer} disabled={enAttente}>
          {enAttente ? "Enregistrement…" : "Enregistrer l'exercice"}
        </Bouton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ */

function BlocQuestion({
  question,
  index,
  total,
  surChangement,
  surDeplacement,
  surSuppression,
}: {
  question: BrouillonQuestion;
  index: number;
  total: number;
  surChangement: (modif: Partial<BrouillonQuestion>) => void;
  surDeplacement: (sens: -1 | 1) => void;
  surSuppression: () => void;
}) {
  const sansBonneReponse =
    question.forme === "fermee" && !question.choices.some((c) => c.correct);

  return (
    <Carte className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Titre niveau={3}>Question {index + 1}</Titre>
        <div className="ml-auto flex items-center gap-1">
          <Bouton
            type="button"
            variante="discret"
            onClick={() => surDeplacement(-1)}
            disabled={index === 0}
            aria-label="Déplacer vers le haut"
          >
            ↑
          </Bouton>
          <Bouton
            type="button"
            variante="discret"
            onClick={() => surDeplacement(1)}
            disabled={index === total - 1}
            aria-label="Déplacer vers le bas"
          >
            ↓
          </Bouton>
          <Bouton
            type="button"
            variante="danger"
            onClick={surSuppression}
            disabled={total === 1}
          >
            Supprimer
          </Bouton>
        </div>
      </div>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Forme de la question</legend>
        {(["fermee", "ouverte"] as const).map((forme) => (
          <label key={forme} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`forme-${question.id}`}
              checked={question.forme === forme}
              onChange={() => surChangement({ forme })}
            />
            {forme === "fermee" ? "Choix fermés (corrigée automatiquement)" : "Réponse rédigée"}
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Matériau à analyser
          <span className="ml-2 font-normal text-xs text-encre-douce">
            facultatif — l&apos;énoncé, la citation, l&apos;extrait
          </span>
        </label>
        <textarea
          rows={2}
          className={`${CHAMP} stimulus`}
          value={question.stimulus}
          onChange={(e) => surChangement({ stimulus: e.target.value })}
          placeholder="« Vous défendez cette réforme uniquement parce que… »"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Consigne</label>
        <input
          className={CHAMP}
          value={question.prompt}
          onChange={(e) => surChangement({ prompt: e.target.value })}
          placeholder="Quel procédé est à l'œuvre ?"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-28 space-y-1.5">
          <label className="block text-sm font-medium">Points</label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className={CHAMP}
            value={question.points}
            onChange={(e) =>
              surChangement({ points: Number(e.target.value) || 1 })
            }
          />
        </div>
        {question.forme === "fermee" && (
          <label className="flex items-center gap-2 pb-2.5 text-sm">
            <input
              type="checkbox"
              checked={question.multiple}
              onChange={(e) => surChangement({ multiple: e.target.checked })}
            />
            Plusieurs réponses attendues
          </label>
        )}
      </div>

      {question.forme === "fermee" ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Choix</span>
            {sansBonneReponse && (
              <Etiquette ton="alerte">
                Aucune bonne réponse cochée — question hors barème
              </Etiquette>
            )}
          </div>

          {question.choices.map((choix, iChoix) => (
            <div
              key={choix.id}
              className="space-y-2 rounded-md border border-bordure bg-fond-enfonce p-3"
            >
              <div className="flex items-center gap-3">
                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <input
                    type={question.multiple ? "checkbox" : "radio"}
                    name={`correct-${question.id}`}
                    checked={choix.correct}
                    onChange={(e) =>
                      surChangement({
                        choices: question.choices.map((c, i) =>
                          question.multiple
                            ? i === iChoix
                              ? { ...c, correct: e.target.checked }
                              : c
                            : { ...c, correct: i === iChoix },
                        ),
                      })
                    }
                  />
                  <span className="text-xs text-encre-douce">juste</span>
                </label>
                <input
                  className={CHAMP}
                  value={choix.label}
                  onChange={(e) =>
                    surChangement({
                      choices: question.choices.map((c, i) =>
                        i === iChoix ? { ...c, label: e.target.value } : c,
                      ),
                    })
                  }
                  placeholder="Attaque personnelle (ad hominem)"
                />
                <Bouton
                  type="button"
                  variante="discret"
                  onClick={() =>
                    surChangement({
                      choices: question.choices.filter((_, i) => i !== iChoix),
                    })
                  }
                  disabled={question.choices.length <= 2}
                  aria-label="Retirer ce choix"
                >
                  ✕
                </Bouton>
              </div>
              <input
                className={CHAMP}
                value={choix.rationale}
                onChange={(e) =>
                  surChangement({
                    choices: question.choices.map((c, i) =>
                      i === iChoix ? { ...c, rationale: e.target.value } : c,
                    ),
                  })
                }
                placeholder="Pourquoi ce choix est juste ou faux (affiché à la correction)"
              />
            </div>
          ))}

          <Bouton
            type="button"
            variante="secondaire"
            onClick={() =>
              surChangement({
                choices: [
                  ...question.choices,
                  { id: nouvelIdentifiant("c"), label: "", correct: false, rationale: "" },
                ],
              })
            }
          >
            Ajouter un choix
          </Bouton>
        </div>
      ) : (
        <div className="space-y-2">
          <span className="block text-sm font-medium">
            Critères d&apos;évaluation
            <span className="ml-2 font-normal text-xs text-encre-douce">
              affichés à l&apos;étudiant ; la correction reste manuelle
            </span>
          </span>
          {question.rubrique.map((critere, iCritere) => (
            <div key={iCritere} className="flex items-center gap-2">
              <input
                className={CHAMP}
                value={critere}
                onChange={(e) =>
                  surChangement({
                    rubrique: question.rubrique.map((r, i) =>
                      i === iCritere ? e.target.value : r,
                    ),
                  })
                }
                placeholder="La thèse est conservée"
              />
              <Bouton
                type="button"
                variante="discret"
                onClick={() =>
                  surChangement({
                    rubrique: question.rubrique.filter((_, i) => i !== iCritere),
                  })
                }
                aria-label="Retirer ce critère"
              >
                ✕
              </Bouton>
            </div>
          ))}
          <Bouton
            type="button"
            variante="secondaire"
            onClick={() => surChangement({ rubrique: [...question.rubrique, ""] })}
          >
            Ajouter un critère
          </Bouton>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Commentaire de correction
          <span className="ml-2 font-normal text-xs text-encre-douce">
            affiché après la soumission
          </span>
        </label>
        <textarea
          rows={2}
          className={CHAMP}
          value={question.explanation}
          onChange={(e) => surChangement({ explanation: e.target.value })}
          placeholder="L'énoncé ne discute pas la réforme : il disqualifie la personne qui la défend."
        />
      </div>
    </Carte>
  );
}
