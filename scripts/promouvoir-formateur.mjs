/**
 * Promeut un compte existant au rôle de formateur.
 *
 * Le rôle ne peut pas être modifié depuis l'interface : un
 * déclencheur de base de données l'interdit à toute requête
 * portant une session utilisateur. Seule la clé de service, qui
 * n'est jamais exposée au navigateur, permet cette opération.
 *
 * Usage :
 *   node --env-file=.env.local scripts/promouvoir-formateur.mjs vous@exemple.fr
 */

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error("Usage : node --env-file=.env.local scripts/promouvoir-formateur.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}

const admin = createClient(url, cle, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// L'API d'administration ne permet pas de filtrer par adresse :
// on parcourt les pages jusqu'à trouver le compte.
let utilisateur = null;
for (let page = 1; page <= 50 && !utilisateur; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`Lecture des comptes impossible : ${error.message}`);
    process.exit(1);
  }
  utilisateur = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}

if (!utilisateur) {
  console.error(`Aucun compte pour ${email}. Créez-le d'abord via la page d'inscription.`);
  process.exit(1);
}

const { error } = await admin
  .from("profiles")
  .update({ role: "formateur" })
  .eq("id", utilisateur.id);

if (error) {
  console.error(`Promotion impossible : ${error.message}`);
  process.exit(1);
}

console.log(`${email} est désormais formateur.`);
