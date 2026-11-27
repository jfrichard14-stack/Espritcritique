/**
 * Crée des comptes et des données de démonstration en local.
 *
 * Destiné au développement : à ne jamais lancer sur le projet de
 * production. Le script refuse de s'exécuter si l'URL Supabase
 * n'est pas une adresse locale.
 *
 * Usage : node --env-file=.env.local scripts/jeu-de-demonstration.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  console.error(
    `Refus : ce script n'est prévu que pour une base locale (URL actuelle : ${url}).`,
  );
  process.exit(1);
}

const admin = createClient(url, cle, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MDP = "demonstration-2026";

async function compte(email, nom, role) {
  const { data: existants } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const dejaLa = existants.users.find((u) => u.email === email);
  if (dejaLa) {
    if (role === "formateur") {
      await admin.from("profiles").update({ role: "formateur" }).eq("id", dejaLa.id);
    }
    return dejaLa.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MDP,
    email_confirm: true,
    user_metadata: { full_name: nom },
  });
  if (error) throw new Error(`${email} : ${error.message}`);

  if (role === "formateur") {
    await admin.from("profiles").update({ role: "formateur" }).eq("id", data.user.id);
  }
  return data.user.id;
}

const formateurId = await compte("formateur@exemple.fr", "Jean Formateur", "formateur");
const etudiants = [
  await compte("camille@exemple.fr", "Camille Martin", "etudiant"),
  await compte("sacha@exemple.fr", "Sacha Dubois", "etudiant"),
  await compte("lou@exemple.fr", "Lou Bernard", "etudiant"),
];

// Cohorte
const { data: cohorte, error: errCohorte } = await admin
  .from("cohorts")
  .insert({
    owner_id: formateurId,
    name: "Argumentation et esprit critique — promotion 2026",
    description:
      "Quatre séances de trois heures. Repérage des procédés argumentatifs, construction d'un plaidoyer, réfutation.",
    starts_on: "2026-01-12",
    ends_on: "2026-02-09",
  })
  .select()
  .single();
if (errCohorte) throw new Error(errCohorte.message);

await admin.from("cohort_members").insert(
  etudiants.map((id) => ({ cohort_id: cohorte.id, profile_id: id })),
);

// Supports — avec de vrais fichiers déposés dans le stockage,
// pour que les téléchargements fonctionnent en démonstration.
const SUPPORTS = [
  {
    titre: "Séance 1 — typologie des arguments",
    description: "Support de séance, avec la grille de repérage en annexe.",
    nom: "seance1-typologie.md",
    publie: true,
    contenu: `# Séance 1 — typologie des arguments

## Trois familles

1. **Argument par l'exemple** — on induit une règle d'un ou plusieurs cas.
   Point de vigilance : la représentativité du cas.
2. **Argument d'autorité** — on s'appuie sur la compétence d'une source.
   Point de vigilance : la compétence porte-t-elle bien sur la question posée ?
3. **Argument par les conséquences** — on juge une thèse à ses effets.
   Point de vigilance : l'effet annoncé est-il établi, ou seulement redouté ?

## Grille de repérage

Pour chaque énoncé, demandez-vous :
- quelle est la thèse ?
- quelles prémisses la soutiennent ?
- la conclusion suivrait-elle si les prémisses étaient vraies ?

La troisième question est la seule qui porte sur la **forme** de l'argument.
Elle se pose indépendamment de l'accord ou du désaccord avec la thèse.
`,
  },
  {
    titre: "Grille d'évaluation du plaidoyer",
    description: "À lire avant la séance 3. Encore en brouillon.",
    nom: "grille-plaidoyer.md",
    publie: false,
    contenu: `# Grille d'évaluation du plaidoyer

| Critère | Observable |
|---|---|
| Thèse | Énoncée dans les trente premières secondes, en une phrase |
| Structure | Deux arguments distincts, non redondants |
| Étayage | Chaque argument appuyé sur un fait ou un exemple vérifiable |
| Réfutation | Une objection réelle, formulée dans sa version la plus forte |
| Débit | Entre 120 et 150 mots par minute |
`,
  },
];

for (const support of SUPPORTS) {
  const chemin = `${cohorte.id}/${crypto.randomUUID()}/${support.nom}`;
  const octets = new TextEncoder().encode(support.contenu);

  const { error: errEnvoi } = await admin.storage
    .from("resources")
    .upload(chemin, octets, { contentType: "text/markdown", upsert: true });
  if (errEnvoi) throw new Error(`envoi ${support.nom} : ${errEnvoi.message}`);

  const { error: errBase } = await admin.from("resources").insert({
    cohort_id: cohorte.id,
    title: support.titre,
    description: support.description,
    storage_path: chemin,
    file_name: support.nom,
    mime_type: "text/markdown",
    size_bytes: octets.byteLength,
    created_by: formateurId,
    published_at: support.publie ? new Date().toISOString() : null,
  });
  if (errBase) throw new Error(`enregistrement ${support.nom} : ${errBase.message}`);
}

// Devoirs
const { data: devoir } = await admin
  .from("assignments")
  .insert({
    cohort_id: cohorte.id,
    title: "Plaidoyer de trois minutes",
    instructions:
      "Rédigez le texte d'un plaidoyer de trois minutes sur un sujet de votre choix.\n\nContraintes :\n— une thèse explicite énoncée dans les trente premières secondes ;\n— deux arguments distincts, chacun étayé par un exemple ;\n— une objection anticipée et réfutée.\n\nDéposez le texte ici, puis apportez-le imprimé en séance 3.",
    due_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    created_by: formateurId,
    published_at: new Date().toISOString(),
  })
  .select()
  .single();

await admin.from("assignments").insert({
  cohort_id: cohorte.id,
  title: "Analyse d'une tribune de presse",
  instructions: "Identifiez la thèse, les prémisses, et au moins un procédé contestable.",
  created_by: formateurId,
  published_at: null,
});

// Un dépôt déjà remis, un autre non
await admin.from("submissions").insert({
  assignment_id: devoir.id,
  profile_id: etudiants[0],
  body:
    "Je soutiens que l'enseignement de l'argumentation devrait être obligatoire au lycée.\n\nPremier argument : une démocratie suppose des citoyens capables de distinguer un raisonnement d'une rhétorique. Sans cette compétence, le débat public se réduit à un affrontement d'affirmations.\n\nDeuxième argument : cette compétence est transférable. Un élève qui sait repérer une généralisation hâtive la repère aussi dans un contrat, un diagnostic, une offre commerciale.\n\nOn objectera que les programmes sont déjà saturés. Mais il ne s'agit pas d'ajouter une matière : il s'agit d'expliciter ce que le commentaire de texte fait déjà implicitement.",
  submitted_at: new Date(Date.now() - 2 * 864e5).toISOString(),
});

// Exercice
const { data: exercice } = await admin
  .from("exercises")
  .insert({
    owner_id: formateurId,
    kind: "drill",
    title: "Repérage de procédés argumentatifs — série 1",
    brief: "Dix énoncés à qualifier. Comptez quinze minutes.",
    content: {
      consigne_generale:
        "Pour chaque énoncé, identifiez le procédé qui rend l'argument contestable.",
      questions: [
        {
          id: "q1",
          forme: "fermee",
          prompt: "Quel procédé est à l'œuvre ?",
          stimulus: "« Vous défendez cette réforme uniquement parce que vous n'avez jamais travaillé en usine. »",
          points: 1,
          multiple: false,
          explanation:
            "L'énoncé ne discute pas la réforme : il disqualifie la personne qui la défend. La question de savoir si la réforme est bonne reste entière.",
          choices: [
            { id: "a", label: "Attaque personnelle (ad hominem)", correct: true, rationale: "La critique porte sur l'auteur, non sur la proposition." },
            { id: "b", label: "Homme de paille", rationale: "Il y aurait homme de paille si la position adverse était déformée avant d'être réfutée." },
            { id: "c", label: "Faux dilemme" },
            { id: "d", label: "Appel à la tradition" },
          ],
        },
        {
          id: "q2",
          forme: "fermee",
          prompt: "Quel procédé est à l'œuvre ?",
          stimulus: "« Soit nous acceptons ce projet, soit nous condamnons la région au déclin. »",
          points: 1,
          multiple: false,
          explanation:
            "Deux issues sont présentées comme exhaustives alors que rien ne l'établit. D'autres projets, ou des variantes de celui-ci, sont possibles.",
          choices: [
            { id: "a", label: "Pente glissante" },
            { id: "b", label: "Faux dilemme", correct: true, rationale: "L'alternative proposée exclut arbitrairement toute autre option." },
            { id: "c", label: "Appel à l'autorité" },
            { id: "d", label: "Généralisation hâtive" },
          ],
        },
        {
          id: "q3",
          forme: "fermee",
          prompt: "Quels éléments affaiblissent cet argument ? (deux réponses)",
          stimulus:
            "« Trois de mes connaissances ont arrêté le sucre et se sentent mieux. Un nutritionniste très suivi sur les réseaux le confirme. C'est donc établi. »",
          points: 2,
          multiple: true,
          explanation:
            "Deux faiblesses distinctes : l'échantillon est minuscule et non contrôlé, et la notoriété d'une source n'est pas une preuve.",
          choices: [
            { id: "a", label: "Généralisation à partir de trois cas", correct: true },
            { id: "b", label: "Appel à l'autorité fondé sur la notoriété", correct: true },
            { id: "c", label: "Contradiction interne" },
            { id: "d", label: "Pétition de principe" },
          ],
        },
        {
          id: "q4",
          forme: "ouverte",
          prompt:
            "Reformulez l'énoncé de la question 2 sous une forme qui resterait défendable.",
          rubrique: [
            "La thèse est conservée",
            "L'alternative n'est plus présentée comme exhaustive",
            "Deux phrases au maximum",
          ],
        },
      ],
    },
  })
  .select()
  .single();

await admin.from("exercise_assignments").insert({
  exercise_id: exercice.id,
  cohort_id: cohorte.id,
  published_at: new Date().toISOString(),
  reveal_corrections: true,
  max_attempts: 3,
});

console.log(`
Jeu de démonstration créé.

  Formateur : formateur@exemple.fr
  Étudiants : camille@exemple.fr, sacha@exemple.fr, lou@exemple.fr
  Mot de passe pour tous : ${MDP}

  Code d'inscription de la cohorte : ${cohorte.invite_code}
`);
