# Esprit Critique

Espace de travail pour des formations en prise de parole, argumentation et
esprit critique. Les étudiants téléchargent les supports, déposent leurs
productions et font des exercices corrigés automatiquement ; le formateur
distribue, relève et commente.

## Ce que fait l'application aujourd'hui

| Fonction | État |
|---|---|
| Comptes individuels, rôles formateur / étudiant | opérationnel |
| Formations (cohortes), inscription par code à huit caractères | opérationnel |
| Supports : dépôt par le formateur, brouillon / publié, téléchargement | opérationnel |
| Devoirs : consignes, échéance, dépôt texte et/ou fichier, brouillon / remise | opérationnel |
| Retours écrits du formateur sur chaque production | opérationnel |
| Bibliothèque d'exercices, affectation à une ou plusieurs formations | opérationnel |
| QCM, drills, études de cas : correction automatique, tentatives plafonnées | opérationnel |
| Tableau de résultats par exercice | opérationnel |
| Cartographie d'argument | **non implémenté** — le schéma le prévoit, l'interface reste à construire |
| Annotation collaborative de textes | **non implémenté** |
| Notifications par courriel (échéances, nouveaux retours) | **non implémenté** |

## Architecture

- **Next.js 16** (App Router, TypeScript, Tailwind 4) — front et back dans une
  seule base de code.
- **Supabase** — Postgres, authentification, stockage de fichiers.
- Les règles d'accès vivent dans la base (*Row Level Security*), pas dans le
  code applicatif. Oublier un contrôle dans une page ne suffit donc pas à
  exposer des données.

### Modèle de sécurité

Trois principes, chacun vérifié par un test automatisé (`npm run test:securite`) :

1. **Un étudiant ne voit que ses propres productions.** Les dépôts, les
   tentatives et les scores des autres lui sont inaccessibles, y compris en
   requêtant directement l'API depuis la console du navigateur.
2. **Les corrigés ne quittent jamais le serveur avant la soumission.** La table
   `exercises` est fermée aux étudiants. L'énoncé leur est servi par la fonction
   `get_exercise_for_student()`, qui retire les marqueurs de bonne réponse et
   les commentaires de correction. La correction est calculée par
   `submit_exercise_attempt()`, côté base.
3. **Le rôle ne peut pas être modifié par l'interface.** Un déclencheur
   l'interdit à toute requête portant une session utilisateur. Promouvoir un
   compte en formateur passe par la clé de service (voir plus bas).

Les fichiers sont stockés dans deux compartiments privés. Aucun n'est
accessible par une URL permanente : chaque téléchargement passe par une URL
signée valable cinq minutes, dont la création est elle-même soumise aux règles
d'accès.

## Développement local

Prérequis : Node 22+, Docker.

```bash
npm install
npm run db:start          # démarre Postgres, Auth et Storage dans Docker
cp .env.example .env.local
```

Reportez dans `.env.local` les valeurs affichées par `npm run db:start`
(`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`).

```bash
node --env-file=.env.local scripts/jeu-de-demonstration.mjs   # données d'exemple
npm run dev
```

Comptes de démonstration — mot de passe `demonstration-2026` :

- `formateur@exemple.fr`
- `camille@exemple.fr`, `sacha@exemple.fr`, `lou@exemple.fr`

Boîte de réception des courriels de test : <http://localhost:54324>.
Console d'administration de la base : <http://localhost:54323>.

### Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | compilation de production |
| `npm run typecheck` | vérification des types |
| `npm run lint` | analyse statique |
| `npm run test:securite` | **tests de cloisonnement** — à relancer après toute modification des politiques |
| `npm run db:reset` | réinitialise la base locale et rejoue les migrations |
| `npm run db:types` | régénère `src/lib/types/database.ts` depuis la base |

Après toute modification du schéma : `npm run db:reset && npm run db:types && npm run test:securite`.

## Mise en ligne

### 1. Projet Supabase

Créez un projet sur <https://supabase.com>. **Choisissez une région de l'Union
européenne** (Frankfurt ou Ireland) : les productions des étudiants sont des
données personnelles.

Liez le dépôt au projet distant puis poussez le schéma :

```bash
npx supabase link --project-ref <identifiant-du-projet>
npx supabase db push
```

Dans *Authentication > URL Configuration*, renseignez l'URL du site et ajoutez
`https://votre-domaine/auth/confirmer` aux URL de redirection autorisées.

### 2. Déploiement

Sur Vercel, importez le dépôt et renseignez les variables de `.env.example`
(valeurs issues de *Project Settings > API* côté Supabase).
`SUPABASE_SERVICE_ROLE_KEY` ne doit **jamais** porter le préfixe `NEXT_PUBLIC_`.

### 3. Votre compte formateur

Créez votre compte par la page d'inscription, puis :

```bash
node --env-file=.env.production.local scripts/promouvoir-formateur.mjs vous@votredomaine.fr
```

Ce script exige la clé de service. Il n'existe volontairement aucun moyen de
devenir formateur depuis l'interface.

## Avant une utilisation réelle

Trois points à traiter, qui ne relèvent pas du code :

1. **Mentions légales et politique de confidentialité.** Les pages existent mais
   contiennent des gabarits. Elles demandent votre identité, votre statut, votre
   hébergeur et les durées de conservation que vous retenez.
2. **Durée de conservation.** Rien n'est supprimé automatiquement. Décidez d'une
   durée et prévoyez la purge — l'archivage d'une cohorte existe en base
   (`cohorts.archived_at`) mais n'est pas encore exposé dans l'interface.
3. **Sauvegardes.** Les formules Supabase payantes incluent des sauvegardes
   quotidiennes ; la formule gratuite non.

## Structure

```
supabase/migrations/   schéma, fonctions et politiques de sécurité
src/app/               pages (App Router)
src/components/        interface
src/lib/actions/       actions serveur (écritures)
src/lib/exercices/     modèle de contenu des exercices
src/lib/supabase/      raccordement à la base
tests/                 tests de cloisonnement
scripts/               promotion d'un formateur, jeu de démonstration
```
