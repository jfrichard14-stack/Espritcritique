import { z } from "zod";

/**
 * Modèle de contenu des exercices.
 *
 * La base stocke ce contenu en jsonb sans l'interpréter ; la
 * validation se fait ici, à l'écriture comme à la lecture. Un
 * exercice enregistré avant une évolution du modèle reste donc
 * lisible, et une erreur de structure se voit à la saisie.
 *
 * Trois types reposent sur la même structure de questionnaire
 * (QCM, drill, étude de cas) : ils ne diffèrent que par la
 * présence d'un stimulus et par le caractère fermé ou ouvert
 * des questions. La cartographie d'argument a sa propre forme.
 */

// ------------------------------------------------------------
// Questionnaires
// ------------------------------------------------------------

export const ChoixSchema = z.object({
  id: z.string().min(1, "Identifiant de choix requis"),
  label: z.string().min(1, "Libellé requis"),
  /** Présent uniquement côté formateur : expurgé avant envoi à l'étudiant. */
  correct: z.boolean().optional(),
  /** Justification de ce choix précis, affichée à la correction. */
  rationale: z.string().optional(),
});

const BaseQuestion = {
  id: z.string().min(1, "Identifiant de question requis"),
  /** La consigne. */
  prompt: z.string().min(1, "Énoncé requis"),
  /**
   * Matériau à analyser : l'argument à qualifier, l'extrait de
   * presse, la citation. Distinct de la consigne pour pouvoir
   * le mettre en forme différemment.
   */
  stimulus: z.string().optional(),
  points: z.number().positive().default(1),
  /** Commentaire général affiché après correction. */
  explanation: z.string().optional(),
};

export const QuestionFermeeSchema = z.object({
  ...BaseQuestion,
  forme: z.literal("fermee"),
  /** Vrai si plusieurs réponses sont attendues simultanément. */
  multiple: z.boolean().default(false),
  choices: z.array(ChoixSchema).min(2, "Au moins deux choix"),
});

export const QuestionOuverteSchema = z.object({
  ...BaseQuestion,
  forme: z.literal("ouverte"),
  /** Critères d'évaluation, visibles ou non selon le réglage. */
  rubrique: z.array(z.string()).default([]),
  attendu_mots_min: z.number().int().nonnegative().optional(),
});

export const QuestionSchema = z.discriminatedUnion("forme", [
  QuestionFermeeSchema,
  QuestionOuverteSchema,
]);

export const ContenuQuestionnaireSchema = z.object({
  consigne_generale: z.string().default(""),
  questions: z.array(QuestionSchema).min(1, "Au moins une question"),
});

// ------------------------------------------------------------
// Cartographie d'argument
// ------------------------------------------------------------

export const ContenuCartographieSchema = z.object({
  consigne_generale: z.string().default(""),
  /** Le texte dont l'étudiant doit extraire la structure. */
  texte_source: z.string().min(1, "Texte source requis"),
  /** Thèse à situer, si elle est donnée d'emblée. */
  these: z.string().optional(),
  /**
   * Structure de référence, à titre de corrigé indicatif.
   * Non utilisée pour une correction automatique : la
   * cartographie n'est pas auto-corrigeable.
   */
  reference: z
    .object({
      noeuds: z.array(
        z.object({
          id: z.string().min(1),
          texte: z.string().min(1),
          role: z.enum(["these", "premisse", "objection", "reponse", "exemple"]),
          soutient: z.array(z.string()).default([]),
        }),
      ),
    })
    .optional(),
  questions: z.array(QuestionSchema).default([]),
});

// ------------------------------------------------------------
// Dispatch par type d'exercice
// ------------------------------------------------------------

export const TYPES_EXERCICE = ["qcm", "drill", "case_study", "argument_map"] as const;
export type TypeExercice = (typeof TYPES_EXERCICE)[number];

export const LIBELLES_TYPE: Record<TypeExercice, string> = {
  qcm: "QCM",
  drill: "Drill d'identification",
  case_study: "Étude de cas",
  argument_map: "Cartographie d'argument",
};

export const ContenuSchema = {
  qcm: ContenuQuestionnaireSchema,
  drill: ContenuQuestionnaireSchema,
  case_study: ContenuQuestionnaireSchema,
  argument_map: ContenuCartographieSchema,
} as const;

export type ContenuQuestionnaire = z.infer<typeof ContenuQuestionnaireSchema>;
export type ContenuCartographie = z.infer<typeof ContenuCartographieSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionFermee = z.infer<typeof QuestionFermeeSchema>;
export type Choix = z.infer<typeof ChoixSchema>;

/**
 * Valide un contenu brut selon le type d'exercice.
 * Renvoie un résultat discriminé plutôt que de lever : les
 * erreurs de saisie doivent être affichées, pas propagées.
 */
export function validerContenu(
  type: TypeExercice,
  brut: unknown,
):
  | { ok: true; contenu: ContenuQuestionnaire | ContenuCartographie }
  | { ok: false; erreurs: string[] } {
  const resultat = ContenuSchema[type].safeParse(brut);
  if (resultat.success) {
    return { ok: true, contenu: resultat.data };
  }
  return {
    ok: false,
    erreurs: resultat.error.issues.map((issue) => {
      const chemin = issue.path.join(".");
      return chemin ? `${chemin} : ${issue.message}` : issue.message;
    }),
  };
}

// ------------------------------------------------------------
// Réponses de l'étudiant
// ------------------------------------------------------------

/**
 * Forme envoyée à public.submit_exercise_attempt().
 * Les questions fermées attendent un tableau d'identifiants de
 * choix ; les questions ouvertes une chaîne, qui n'entre pas
 * dans le barème automatique.
 */
export const ReponsesSchema = z.record(
  z.string(),
  z.union([z.array(z.string()), z.string()]),
);

export type Reponses = z.infer<typeof ReponsesSchema>;

/** Identifiant court, lisible, suffisant pour distinguer des questions. */
export function nouvelIdentifiant(prefixe: string): string {
  return `${prefixe}_${Math.random().toString(36).slice(2, 8)}`;
}
