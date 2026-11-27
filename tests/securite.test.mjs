/**
 * Vérification du cloisonnement des données.
 *
 * Ces tests ne vérifient pas que l'application fonctionne : ils
 * vérifient qu'elle refuse ce qu'elle doit refuser. Chaque cas
 * correspond à une tentative d'accès qu'un étudiant pourrait
 * produire depuis la console de son navigateur, en contournant
 * entièrement l'interface.
 *
 * Lancement : npm run test:securite
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SUPABASE || !CLE_ANON || !CLE_SERVICE) {
  throw new Error(
    "Variables Supabase absentes. Lancer avec : node --env-file=.env.local --test tests/",
  );
}

const MDP = "motdepasse-de-test-1234";
const suffixe = Date.now().toString(36);

const admin = createClient(URL_SUPABASE, CLE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function creerCompte(prefixe, role = "etudiant") {
  const email = `${prefixe}-${suffixe}@exemple.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MDP,
    email_confirm: true,
    user_metadata: { full_name: prefixe },
  });
  if (error) throw new Error(`création ${prefixe} : ${error.message}`);

  if (role === "formateur") {
    const { error: err } = await admin
      .from("profiles")
      .update({ role: "formateur" })
      .eq("id", data.user.id);
    if (err) throw new Error(`promotion ${prefixe} : ${err.message}`);
  }
  return { id: data.user.id, email };
}

async function clientConnecte(email) {
  const client = createClient(URL_SUPABASE, CLE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: MDP });
  if (error) throw new Error(`connexion ${email} : ${error.message}`);
  return client;
}

const CONTENU_DRILL = {
  consigne_generale: "Identifier le procédé argumentatif en jeu.",
  questions: [
    {
      id: "q1",
      forme: "fermee",
      prompt: "Quel procédé est à l'œuvre ?",
      stimulus: "« Vous dites cela uniquement parce que vous êtes jeune. »",
      points: 2,
      multiple: false,
      explanation:
        "L'énoncé s'attaque à la personne au lieu de discuter la proposition.",
      choices: [
        { id: "a", label: "Attaque personnelle (ad hominem)", correct: true },
        { id: "b", label: "Homme de paille" },
        { id: "c", label: "Faux dilemme" },
      ],
    },
    {
      id: "q2",
      forme: "fermee",
      prompt: "Quels marqueurs relevez-vous ? (deux réponses)",
      points: 1,
      multiple: true,
      choices: [
        { id: "a", label: "Généralisation hâtive", correct: true },
        { id: "b", label: "Appel à l'autorité", correct: true },
        { id: "c", label: "Donnée chiffrée vérifiable" },
      ],
    },
    {
      id: "q3",
      forme: "ouverte",
      prompt: "Reformulez l'argument sous sa forme la plus défendable.",
      rubrique: ["Fidélité au propos", "Concision"],
    },
  ],
};

test("cloisonnement des données entre comptes", async (t) => {
  // ----------------------------------------------------------
  // Mise en place
  // ----------------------------------------------------------
  const formateur = await creerCompte("formateur", "formateur");
  const etudiantA = await creerCompte("etudiant-a");
  const etudiantB = await creerCompte("etudiant-b");
  const intrus = await creerCompte("intrus");

  const cliF = await clientConnecte(formateur.email);
  const cliA = await clientConnecte(etudiantA.email);
  const cliB = await clientConnecte(etudiantB.email);
  const cliIntrus = await clientConnecte(intrus.email);

  let cohorte, devoir, ressourcePubliee, ressourceBrouillon, affectation;

  await t.test("le formateur crée une cohorte et son contenu", async () => {
    const { data, error } = await cliF
      .from("cohorts")
      .insert({ name: "Argumentation — promo test", owner_id: formateur.id })
      .select()
      .single();
    assert.equal(error, null, error?.message);
    assert.ok(data.invite_code, "un code d'invitation doit être généré");
    assert.match(data.invite_code, /^[A-Z2-9]{8}$/, "code lisible à l'oral");
    cohorte = data;

    const { data: dev, error: errDev } = await cliF
      .from("assignments")
      .insert({
        cohort_id: cohorte.id,
        title: "Plaidoyer de trois minutes",
        instructions: "Déposer le texte de votre plaidoyer.",
        created_by: formateur.id,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    assert.equal(errDev, null, errDev?.message);
    devoir = dev;

    const { data: resPub, error: errPub } = await cliF
      .from("resources")
      .insert({
        cohort_id: cohorte.id,
        title: "Support de séance 1",
        storage_path: `${cohorte.id}/support1/seance1.pdf`,
        file_name: "seance1.pdf",
        created_by: formateur.id,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    assert.equal(errPub, null, errPub?.message);
    ressourcePubliee = resPub;

    const { data: resBr, error: errBr } = await cliF
      .from("resources")
      .insert({
        cohort_id: cohorte.id,
        title: "Corrigé — ne pas diffuser",
        storage_path: `${cohorte.id}/corrige/corrige.pdf`,
        file_name: "corrige.pdf",
        created_by: formateur.id,
        published_at: null,
      })
      .select()
      .single();
    assert.equal(errBr, null, errBr?.message);
    ressourceBrouillon = resBr;

    const { data: ex, error: errEx } = await cliF
      .from("exercises")
      .insert({
        owner_id: formateur.id,
        kind: "drill",
        title: "Drill — repérage de sophismes",
        content: CONTENU_DRILL,
      })
      .select()
      .single();
    assert.equal(errEx, null, errEx?.message);

    const { data: aff, error: errAff } = await cliF
      .from("exercise_assignments")
      .insert({
        exercise_id: ex.id,
        cohort_id: cohorte.id,
        published_at: new Date().toISOString(),
        reveal_corrections: true,
      })
      .select()
      .single();
    assert.equal(errAff, null, errAff?.message);
    affectation = aff;
  });

  await t.test("un étudiant rejoint la cohorte par code", async () => {
    const { data, error } = await cliA.rpc("join_cohort", {
      p_invite_code: cohorte.invite_code.toLowerCase(), // insensible à la casse
    });
    assert.equal(error, null, error?.message);
    assert.equal(data[0].deja_membre, false);
    assert.equal(data[0].cohort_name, "Argumentation — promo test");

    const { data: rejeu } = await cliA.rpc("join_cohort", {
      p_invite_code: cohorte.invite_code,
    });
    assert.equal(rejeu[0].deja_membre, true, "second appel idempotent");

    const { error: errB } = await cliB.rpc("join_cohort", {
      p_invite_code: cohorte.invite_code,
    });
    assert.equal(errB, null, errB?.message);
  });

  await t.test("un code d'invitation erroné est refusé", async () => {
    const { error } = await cliIntrus.rpc("join_cohort", {
      p_invite_code: "ZZZZZZZZ",
    });
    assert.ok(error, "un code inconnu doit échouer");
    assert.match(error.message, /inconnu/i);
  });

  await t.test("les ressources en brouillon restent invisibles", async () => {
    const { data, error } = await cliA.from("resources").select("id, title");
    assert.equal(error, null, error?.message);
    const ids = data.map((r) => r.id);
    assert.ok(ids.includes(ressourcePubliee.id), "la ressource publiée est visible");
    assert.ok(
      !ids.includes(ressourceBrouillon.id),
      "le brouillon ne doit JAMAIS remonter côté étudiant",
    );
  });

  await t.test("un non-membre ne voit rien de la cohorte", async () => {
    const { data: coh } = await cliIntrus.from("cohorts").select("id");
    assert.deepEqual(coh, [], "aucune cohorte visible");

    const { data: res } = await cliIntrus.from("resources").select("id");
    assert.deepEqual(res, [], "aucune ressource visible");

    const { data: dev } = await cliIntrus.from("assignments").select("id");
    assert.deepEqual(dev, [], "aucun devoir visible");
  });

  await t.test("un étudiant ne voit pas les dépôts des autres", async () => {
    const { data: depotA, error: errA } = await cliA
      .from("submissions")
      .insert({
        assignment_id: devoir.id,
        profile_id: etudiantA.id,
        body: "Mon plaidoyer, confidentiel.",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();
    assert.equal(errA, null, errA?.message);

    const { data: vuParB } = await cliB.from("submissions").select("id, body");
    assert.deepEqual(vuParB, [], "B ne doit voir aucun dépôt de A");

    const { data: vuParA } = await cliA.from("submissions").select("id");
    assert.equal(vuParA.length, 1, "A voit son propre dépôt");

    const { data: vuParF } = await cliF.from("submissions").select("id, body");
    assert.equal(vuParF.length, 1, "le formateur voit le dépôt");
    assert.equal(vuParF[0].body, "Mon plaidoyer, confidentiel.");

    // Tentative d'écriture dans le dépôt d'un autre.
    const { error: errUsurp } = await cliB
      .from("submissions")
      .insert({
        assignment_id: devoir.id,
        profile_id: etudiantA.id,
        body: "Dépôt usurpé",
      });
    assert.ok(errUsurp, "déposer au nom d'un autre doit échouer");

    void depotA;
  });

  await t.test("les corrigés d'exercice sont inaccessibles aux étudiants", async () => {
    const { data, error } = await cliA.from("exercises").select("id, content");
    assert.equal(error, null, error?.message);
    assert.deepEqual(data, [], "la table des exercices est hors de portée");
  });

  await t.test("l'énoncé servi à l'étudiant est expurgé", async () => {
    const { data, error } = await cliA.rpc("get_exercise_for_student", {
      p_exercise_assignment_id: affectation.id,
    });
    assert.equal(error, null, error?.message);

    const serialise = JSON.stringify(data);
    assert.ok(!serialise.includes('"correct"'), "aucun marqueur de bonne réponse");
    assert.ok(
      !serialise.includes("au lieu de discuter la proposition"),
      "aucune explication de corrigé avant soumission",
    );
    assert.equal(data.content.questions.length, 3);
    assert.equal(data.content.questions[0].choices.length, 3);
    assert.equal(data.tentatives_utilisees, 0);
  });

  await t.test("la correction automatique calcule le barème attendu", async () => {
    const { data, error } = await cliA.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: affectation.id,
      p_answers: { q1: ["a"], q2: ["a", "b"], q3: "Reformulation libre." },
    });
    assert.equal(error, null, error?.message);
    assert.equal(Number(data.score), 3, "2 points + 1 point");
    assert.equal(Number(data.max_score), 3, "la question ouverte est hors barème");

    const ouverte = data.par_question.find((q) => q.question_id === "q3");
    assert.equal(ouverte.auto_corrigee, false);

    const { data: partiel } = await cliB.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: affectation.id,
      p_answers: { q1: ["b"], q2: ["a"] },
    });
    assert.equal(Number(partiel.score), 0, "réponse partielle en QCM multiple : 0");
    assert.equal(Number(partiel.max_score), 3);
  });

  await t.test("un étudiant ne peut pas s'attribuer un score", async () => {
    const { error } = await cliA.from("exercise_attempts").insert({
      exercise_assignment_id: affectation.id,
      profile_id: etudiantA.id,
      answers: {},
      score: 100,
      max_score: 100,
      submitted_at: new Date().toISOString(),
    });
    assert.ok(error, "inscrire un score à la main doit échouer");
  });

  await t.test("un étudiant ne peut pas se promouvoir formateur", async () => {
    const { error } = await cliA
      .from("profiles")
      .update({ role: "formateur" })
      .eq("id", etudiantA.id);
    assert.ok(error, "l'élévation de privilège doit échouer");
    assert.match(error.message, /rôle ne peut pas être modifié/i);

    const { data } = await cliA.from("profiles").select("role").eq("id", etudiantA.id);
    assert.equal(data[0].role, "etudiant");
  });

  await t.test("un étudiant ne peut pas créer de cohorte", async () => {
    const { error } = await cliA
      .from("cohorts")
      .insert({ name: "Cohorte pirate", owner_id: etudiantA.id });
    assert.ok(error, "seul un formateur crée des cohortes");
  });

  await t.test("le stockage respecte le cloisonnement par dossier", async () => {
    const fichier = new Blob(["contenu de test"], { type: "text/plain" });

    const { error: errPropre } = await cliA.storage
      .from("submissions")
      .upload(`${devoir.id}/${etudiantA.id}/plaidoyer.txt`, fichier);
    assert.equal(errPropre, null, errPropre?.message);

    const { error: errAutrui } = await cliB.storage
      .from("submissions")
      .upload(`${devoir.id}/${etudiantA.id}/injecte.txt`, fichier);
    assert.ok(errAutrui, "déposer dans le dossier d'un autre doit échouer");

    const { error: errLecture } = await cliB.storage
      .from("submissions")
      .download(`${devoir.id}/${etudiantA.id}/plaidoyer.txt`);
    assert.ok(errLecture, "lire le fichier d'un autre doit échouer");

    const { error: errFormateur } = await cliF.storage
      .from("submissions")
      .download(`${devoir.id}/${etudiantA.id}/plaidoyer.txt`);
    assert.equal(errFormateur, null, "le formateur accède au dépôt");
  });
});

test("tentatives, plafonds et rétention du corrigé", async (t) => {
  const formateur = await creerCompte("form2", "formateur");
  const etudiant = await creerCompte("etud2");
  const cliF = await clientConnecte(formateur.email);
  const cliE = await clientConnecte(etudiant.email);

  const { data: cohorte } = await cliF
    .from("cohorts")
    .insert({ name: "Cohorte tentatives", owner_id: formateur.id })
    .select()
    .single();

  await cliE.rpc("join_cohort", { p_invite_code: cohorte.invite_code });

  const { data: exercice } = await cliF
    .from("exercises")
    .insert({
      owner_id: formateur.id,
      kind: "qcm",
      title: "QCM court",
      content: CONTENU_DRILL,
    })
    .select()
    .single();

  await t.test("le numéro de tentative est fourni par la base", async () => {
    const { data: aff } = await cliF
      .from("exercise_assignments")
      .insert({
        exercise_id: exercice.id,
        cohort_id: cohorte.id,
        published_at: new Date().toISOString(),
        max_attempts: 2,
        reveal_corrections: true,
      })
      .select()
      .single();

    const premiere = await cliE.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: aff.id,
      p_answers: { q1: ["b"] },
    });
    assert.equal(premiere.error, null, premiere.error?.message);
    assert.equal(premiere.data.tentative_numero, 1);
    assert.equal(premiere.data.max_attempts, 2);

    const seconde = await cliE.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: aff.id,
      p_answers: { q1: ["a"], q2: ["a", "b"] },
    });
    assert.equal(seconde.data.tentative_numero, 2);
    assert.equal(Number(seconde.data.score), 3);

    const troisieme = await cliE.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: aff.id,
      p_answers: { q1: ["a"] },
    });
    assert.ok(troisieme.error, "la troisième tentative doit être refusée");
    assert.match(troisieme.error.message, /épuisé/i);
  });

  await t.test("mode « score seul » : aucun corrigé n'est renvoyé", async () => {
    const { data: exo } = await cliF
      .from("exercises")
      .insert({
        owner_id: formateur.id,
        kind: "qcm",
        title: "QCM discret",
        content: CONTENU_DRILL,
      })
      .select()
      .single();

    const { data: aff } = await cliF
      .from("exercise_assignments")
      .insert({
        exercise_id: exo.id,
        cohort_id: cohorte.id,
        published_at: new Date().toISOString(),
        reveal_corrections: false,
      })
      .select()
      .single();

    const { data } = await cliE.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: aff.id,
      p_answers: { q1: ["c"] },
    });

    assert.equal(data.corrections_revelees, false);
    const serialise = JSON.stringify(data);
    assert.ok(!serialise.includes("attendu"), "les bonnes réponses ne doivent pas figurer");
    assert.ok(
      !serialise.includes("au lieu de discuter"),
      "les explications ne doivent pas figurer",
    );
    assert.equal(Number(data.score), 0, "le score reste communiqué");
    assert.equal(Number(data.max_score), 3);
  });

  await t.test("un exercice non publié n'est pas soumettable", async () => {
    const { data: exo } = await cliF
      .from("exercises")
      .insert({
        owner_id: formateur.id,
        kind: "qcm",
        title: "QCM en préparation",
        content: CONTENU_DRILL,
      })
      .select()
      .single();

    const { data: aff } = await cliF
      .from("exercise_assignments")
      .insert({ exercise_id: exo.id, cohort_id: cohorte.id, published_at: null })
      .select()
      .single();

    const lecture = await cliE.rpc("get_exercise_for_student", {
      p_exercise_assignment_id: aff.id,
    });
    assert.ok(lecture.error, "lecture d'un exercice non publié refusée");

    const envoi = await cliE.rpc("submit_exercise_attempt", {
      p_exercise_assignment_id: aff.id,
      p_answers: {},
    });
    assert.ok(envoi.error, "soumission d'un exercice non publié refusée");
  });

  await t.test("redéposer après un retour conserve le retour", async () => {
    const { data: devoir } = await cliF
      .from("assignments")
      .insert({
        cohort_id: cohorte.id,
        title: "Devoir révisable",
        created_by: formateur.id,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    await cliE.from("submissions").insert({
      assignment_id: devoir.id,
      profile_id: etudiant.id,
      body: "Première version.",
      submitted_at: new Date().toISOString(),
    });

    const { data: depot } = await cliF
      .from("submissions")
      .select("id")
      .eq("assignment_id", devoir.id)
      .single();

    const { error: errRetour } = await cliF
      .from("submissions")
      .update({
        feedback: "À retravailler : la thèse n'est pas explicite.",
        feedback_at: new Date().toISOString(),
        feedback_by: formateur.id,
      })
      .eq("id", depot.id);
    assert.equal(errRetour, null, errRetour?.message);

    // L'étudiant redépose : l'opération doit passer et ne pas
    // effacer le retour du formateur.
    const { error: errRedepot } = await cliE.from("submissions").upsert(
      {
        assignment_id: devoir.id,
        profile_id: etudiant.id,
        body: "Deuxième version, thèse explicitée.",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,profile_id" },
    );
    assert.equal(errRedepot, null, errRedepot?.message);

    const { data: apres } = await cliE
      .from("submissions")
      .select("body, feedback")
      .eq("assignment_id", devoir.id)
      .single();

    assert.equal(apres.body, "Deuxième version, thèse explicitée.");
    assert.match(apres.feedback, /thèse n'est pas explicite/);
  });

  await t.test("un étudiant ne peut pas écrire son propre retour", async () => {
    const { data: devoir } = await cliF
      .from("assignments")
      .insert({
        cohort_id: cohorte.id,
        title: "Devoir protégé",
        created_by: formateur.id,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    const { error } = await cliE.from("submissions").insert({
      assignment_id: devoir.id,
      profile_id: etudiant.id,
      body: "Ma production.",
      feedback: "Excellent travail. — l'étudiant lui-même",
      submitted_at: new Date().toISOString(),
    });
    assert.ok(error, "déposer en s'auto-attribuant un retour doit échouer");
  });
});
