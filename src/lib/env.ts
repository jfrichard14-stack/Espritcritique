/**
 * Lecture d'une variable d'environnement obligatoire.
 * Échoue au démarrage plutôt qu'au premier appel réseau :
 * une configuration incomplète doit se voir tout de suite.
 */
export function requireEnv(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. ` +
        `Copiez .env.example vers .env.local et renseignez-la.`,
    );
  }
  return valeur;
}
